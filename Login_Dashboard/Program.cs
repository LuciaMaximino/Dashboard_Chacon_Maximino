using Microsoft.Data.SqlClient;
using System.Data;

var builder = WebApplication.CreateBuilder(args); //prepara el servidor
var app = builder.Build(); //crea la app que se va a ejecutar después con el app.run()

string connectionString = "server=DESKTOP-7BS5OLT\\SQLEXPRESS; database=Dashboard; Integrated Security=true; TrustServerCertificate=True;";

//hace que el sitio sirva archivos estáticos de la carpeta wwwroot
app.UseDefaultFiles();
app.UseStaticFiles();

// Endpoint de login
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

app.Run();

public record LoginRequest(string Usuario, string Contrasena); //json del login