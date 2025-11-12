using Microsoft.Data.SqlClient;
using System;
using System.Data;

var builder = WebApplication.CreateBuilder(args); //prepara el servidor
var app = builder.Build(); //crea la app que se va a ejecutar después con el app.run()

string connectionString = "server=DESKTOP-7BS5OLT\\SQLEXPRESS; database=Dashboard; Integrated Security=true; TrustServerCertificate=True;";

//hace que el sitio sirva archivos estáticos de la carpeta wwwroot
app.UseDefaultFiles();
app.UseStaticFiles();

//endpoint de login
app.MapPost("/login", async (LoginRequest request) =>
{
    using var connection = new SqlConnection(connectionString); //cierra automáticamente la conexión cuando termina
    await connection.OpenAsync(); //abre la conexion

    string hashPassword = Login_Dashboard.Seguridad.EncriptarSHA256(request.Contrasena); //encripta la contraseña

    string query = "SELECT * FROM Usuarios WHERE nombre_usuario = @usuario AND contraseña = @contrasena"; //busca que el usuario y la contraseña que se ingresan coincida con el que esta en la bd
    using var command = new SqlCommand(query, connection);
    command.Parameters.Add("@usuario", SqlDbType.VarChar, 100).Value = request.Usuario;
    var strhola = command.Parameters.Add("@contrasena", SqlDbType.VarChar, 100).Value = hashPassword;


    using var reader = await command.ExecuteReaderAsync();
    if (reader.HasRows)
    {
        return Results.Ok(); //responde con un 200 
    }
    else
    {
        return Results.Unauthorized(); //responde con un 401
    }
});

//endpoints para el drill down/drill up
//nivel 1 - obtener ventas por canal
app.MapGet("/api/sales-channels", async () =>
{
    using var connection = new SqlConnection(connectionString);
    await connection.OpenAsync();
    //trae todos los canales de venta, les une las ventas y los productos vendidos y agrupa por cana ordenando de + a - por total de ventas
    string query = @"
        SELECT 
            cv.codigo_canal AS id,
            cv.nombre AS name,
            ISNULL(SUM(vp.precio_total), 0) AS total,
            COUNT(DISTINCT v.numero_venta) AS sales
        FROM CanalesVentas cv
        LEFT JOIN Ventas v ON cv.codigo_canal = v.codigo_canal
        LEFT JOIN VentasProductos vp ON v.numero_venta = vp.numero_venta
        GROUP BY cv.codigo_canal, cv.nombre
        ORDER BY total DESC";

    using var command = new SqlCommand(query, connection);
    using var reader = await command.ExecuteReaderAsync();

    var channels = new List<object>(); //lista vacía donde se guardan todos los canales
    while (await reader.ReadAsync())
    {
        channels.Add(new
        {
            id = reader["id"].ToString(),
            name = reader["name"].ToString(),
            total = Convert.ToDecimal(reader["total"]),
            sales = Convert.ToInt32(reader["sales"])
        });
    }

    return Results.Ok(channels);
});

//nivel 2 - obtener ventas de un canal específico
app.MapGet("/api/sales-channels/{channelId}/sales", async (string channelId) =>
{
    using var connection = new SqlConnection(connectionString);
    await connection.OpenAsync();
    //trae las ventas de un canal especifico, las une con los clientes para mostrar el nombre y suma el total de productos de cada venta
    string query = @"
        SELECT 
            v.numero_venta AS number,
            FORMAT(v.fecha_venta, 'yyyy-MM-dd') AS date,
            CONCAT(c.nombre, ' ', c.apellido) AS customer,
            SUM(vp.precio_total) AS total
        FROM Ventas v
        INNER JOIN Clientes c ON v.codigo_cliente = c.codigo_cliente
        INNER JOIN VentasProductos vp ON v.numero_venta = vp.numero_venta
        WHERE v.codigo_canal = @channelId
        GROUP BY v.numero_venta, v.fecha_venta, c.nombre, c.apellido
        ORDER BY v.fecha_venta DESC";

    using var command = new SqlCommand(query, connection);
    command.Parameters.AddWithValue("@channelId", channelId);
    using var reader = await command.ExecuteReaderAsync();

    var sales = new List<object>();
    while (await reader.ReadAsync())
    {
        sales.Add(new
        {
            number = reader["number"].ToString(),
            date = reader["date"].ToString(),
            customer = reader["customer"].ToString(),
            total = Convert.ToDecimal(reader["total"])
        });
    }

    return Results.Ok(sales);
});

//nivel 3 - obtener detalle de una venta específica
app.MapGet("/api/sales/{saleNumber}/details", async (int saleNumber) =>
{
    using var connection = new SqlConnection(connectionString);
    await connection.OpenAsync();
    //trae todos los productos de una venta especifica y los ordena por item
    string query = @"
        SELECT 
            vp.item,
            p.codigo_producto AS code,
            p.descripcion AS product,
            vp.cantidad AS quantity,
            vp.precio_unitario AS price,
            vp.precio_total AS total
        FROM VentasProductos vp
        INNER JOIN Productos p ON vp.codigo_producto = p.codigo_producto
        WHERE vp.numero_venta = @saleNumber
        ORDER BY vp.item";

    using var command = new SqlCommand(query, connection);
    command.Parameters.AddWithValue("@saleNumber", saleNumber);
    using var reader = await command.ExecuteReaderAsync();

    var details = new List<object>();
    while (await reader.ReadAsync())
    {
        details.Add(new
        {
            item = Convert.ToInt32(reader["item"]),
            code = reader["code"].ToString(),
            product = reader["product"].ToString(),
            quantity = Convert.ToInt32(reader["quantity"]),
            price = Convert.ToDecimal(reader["price"]),
            total = Convert.ToDecimal(reader["total"])
        });
    }

    return Results.Ok(details);
});

//endpoint para obtener productos con la semaforización
app.MapGet("/api/products", async () =>
{
    using var connection = new SqlConnection(connectionString);
    await connection.OpenAsync();

    string query = @"
        SELECT 
            p.codigo_producto AS code,
            p.descripcion AS name,
            cp.nombre AS category,
            ISNULL(SUM(vp.cantidad), 0) AS sales,
            ISNULL(SUM(vp.precio_total), 0) AS revenue,
            CASE 
                WHEN ISNULL(SUM(vp.cantidad), 0) >= 25 THEN 'high'
                WHEN ISNULL(SUM(vp.cantidad), 0) >= 10 THEN 'medium'
                ELSE 'low'
            END AS status
        FROM Productos p
        INNER JOIN CategoriasProductos cp ON p.codigo_categoria = cp.codigo_categoria
        LEFT JOIN VentasProductos vp ON p.codigo_producto = vp.codigo_producto
        GROUP BY p.codigo_producto, p.descripcion, cp.nombre
        ORDER BY sales DESC";

    using var command = new SqlCommand(query, connection);
    using var reader = await command.ExecuteReaderAsync();

    var products = new List<object>();
    while (await reader.ReadAsync())
    {
        products.Add(new
        {
            code = reader["code"].ToString(),
            name = reader["name"].ToString(),
            category = reader["category"].ToString(),
            sales = Convert.ToInt32(reader["sales"]),
            revenue = Convert.ToDecimal(reader["revenue"]),
            status = reader["status"].ToString()
        });
    }

    return Results.Ok(products);
});

//endpoint para obtener los clientes por provincia
app.MapGet("/api/customers", async () =>
{
    using var connection = new SqlConnection(connectionString);
    await connection.OpenAsync();

    string query = @"
        SELECT 
            p.nombre AS province,
            COUNT(DISTINCT c.codigo_cliente) AS customers,
            COUNT(DISTINCT v.numero_venta) AS sales
        FROM Provincias p
        LEFT JOIN Clientes c ON p.codigo_provincia = c.codigo_provincia
        LEFT JOIN Ventas v ON c.codigo_cliente = v.codigo_cliente
        GROUP BY p.nombre
        HAVING COUNT(DISTINCT c.codigo_cliente) > 0
        ORDER BY customers DESC";

    using var command = new SqlCommand(query, connection);
    using var reader = await command.ExecuteReaderAsync();

    var customers = new List<object>();
    while (await reader.ReadAsync())
    {
        customers.Add(new
        {
            province = reader["province"].ToString(),
            customers = Convert.ToInt32(reader["customers"]),
            sales = Convert.ToInt32(reader["sales"])
        });
    }

    return Results.Ok(customers);
});

//endpoint para obtener categorías de productos
app.MapGet("/api/categories", async () =>
{
    using var connection = new SqlConnection(connectionString);
    await connection.OpenAsync();

    string query = @"
        SELECT 
            cp.nombre AS name,
            COUNT(DISTINCT p.codigo_producto) AS products,
            ISNULL(SUM(vp.cantidad), 0) AS sales,
            ISNULL(SUM(vp.precio_total), 0) AS revenue
        FROM CategoriasProductos cp
        LEFT JOIN Productos p ON cp.codigo_categoria = p.codigo_categoria
        LEFT JOIN VentasProductos vp ON p.codigo_producto = vp.codigo_producto
        GROUP BY cp.nombre
        ORDER BY revenue DESC";

    using var command = new SqlCommand(query, connection);
    using var reader = await command.ExecuteReaderAsync();

    var categories = new List<object>();
    while (await reader.ReadAsync())
    {
        categories.Add(new
        {
            name = reader["name"].ToString(),
            products = Convert.ToInt32(reader["products"]),
            sales = Convert.ToInt32(reader["sales"]),
            revenue = Convert.ToDecimal(reader["revenue"])
        });
    }

    return Results.Ok(categories);
});

app.Run();

public record LoginRequest(string Usuario, string Contrasena); //json del login