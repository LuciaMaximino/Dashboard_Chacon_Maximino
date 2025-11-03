using Microsoft.Data.SqlClient;
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

    var channels = new List<object>();
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

// Nivel 3 - obtener detalle de una venta específica
app.MapGet("/api/sales/{saleNumber}/details", async (int saleNumber) =>
{
    using var connection = new SqlConnection(connectionString);
    await connection.OpenAsync();

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

app.Run();

public record LoginRequest(string Usuario, string Contrasena); //json del login