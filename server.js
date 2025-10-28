// Importa las librerías necesarias
const express = require('express');
const stripe = require('stripe');
const cors = require('cors');
const fs = require('fs');

// --- ¡CONFIGURACIÓN DE SEGURIDAD PARA LA NUBE! ---
// Lee la clave secreta de Stripe de las variables de entorno del servidor.
// Esto evita que la clave esté expuesta en el código fuente.
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Valida que la clave secreta exista antes de continuar.
if (!stripeSecretKey) {
  console.error("Error Crítico: La variable de entorno STRIPE_SECRET_KEY no está definida.");
  process.exit(1); // Detiene el servidor si la clave no está configurada.
}

const stripeInstance = stripe(stripeSecretKey);

// Crea la aplicación del servidor
const app = express();

// Configura los 'middlewares'
app.use(express.json()); // Para que el servidor entienda el JSON que le envía la app.
app.use(cors());         // Para permitir que tu app se conecte desde cualquier dirección (importante para Render).

// --- Endpoint de verificación (Ruta raíz) ---
// Es una buena práctica tener una ruta raíz que confirme que el servidor está funcionando.
app.get('/', (req, res) => {
  res.send('¡El servidor de BigFood está en línea y listo para recibir pagos!');
});

// --- Endpoint principal que tu app va a llamar ---
app.post('/create-payment-intent', async (req, res) => {
  // Obtiene el 'amount' del cuerpo (body) de la solicitud que envía la app.
  const { amount } = req.body;

  console.log(`Solicitud recibida para crear un pago por: ${amount}`);

  // Valida que el monto exista y sea un número válido.
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).send({ error: 'El monto es obligatorio y debe ser un número positivo.' });
  }

  try {
    // Crea el 'PaymentIntent' en Stripe.
    const paymentIntent = await stripeInstance.paymentIntents.create({
      amount: amount,   // El monto que recibimos de la app (en centavos).
      currency: 'clp',  // Moneda (pesos chilenos).
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log(`PaymentIntent creado con éxito: ${paymentIntent.id}`);

    // Envía la respuesta a la app con el 'clientSecret' que necesita.
    res.json({
      clientSecret: paymentIntent.client_secret,
    });

  } catch (e) {
    console.error("Error al crear el PaymentIntent en Stripe:", e.message);
    res.status(500).send({ error: 'Hubo un problema al contactar al servicio de pagos: ' + e.message });
  }
});

    // --- Endpoint para guardar el pedido después de un pago exitoso ---
    // --- Endpoint para guardar el pedido después de un pago exitoso ---
    app.post('/guardar-pedido', (req, res) => {
      // 1. Recibimos los datos del pedido desde la app
      const nuevoPedido = req.body;
      console.log('Solicitud recibida para guardar el siguiente pedido:', nuevoPedido);

      // 2. Validamos que los datos básicos estén presentes
      if (!nuevoPedido || !nuevoPedido.clientName || !nuevoPedido.items || !nuevoPedido.paymentId) {
        // Si faltan datos, no continuamos y respondemos con un error.
        return res.status(400).send({ error: 'Faltan datos en el pedido.' });
      }

      const archivoPedidos = 'pedidos.json';

      // 3. Leemos el archivo de pedidos existente (si lo hay)
      fs.readFile(archivoPedidos, 'utf8', (err, data) => {
        let pedidos = [];
        if (!err && data) {
          // Si el archivo existe y tiene contenido, lo convertimos a un array
          try {
            pedidos = JSON.parse(data);
            if (!Array.isArray(pedidos)) { // Verificación extra por si el JSON no es un array
                console.warn("pedidos.json no contenía un array, se reiniciará.");
                pedidos = [];
            }
          } catch (e) {
            console.error("Error al parsear pedidos.json, se creará un archivo nuevo.", e);
            // Si el archivo está corrupto, empezamos con un array vacío.
            pedidos = [];
          }
        }

        // 4. Añadimos el nuevo pedido al array
        pedidos.push(nuevoPedido);

        // 5. Escribimos el array actualizado de vuelta al archivo pedidos.json
        fs.writeFile(archivoPedidos, JSON.stringify(pedidos, null, 2), 'utf8', (writeErr) => {
          if (writeErr) {
            console.error("Error al escribir en pedidos.json:", writeErr);
            return res.status(500).send({ error: 'No se pudo guardar el pedido en el servidor.' });
          }

          console.log(`¡Pedido guardado con éxito! El archivo ${archivoPedidos} ha sido actualizado.`);
          // Respondemos con éxito a la app.
          res.status(200).send({ message: 'Pedido guardado correctamente.' });
        });
      });
    });
    
  

// --- Configuración del Puerto para Render (con fallback para desarrollo local) ---
// Render proveerá el puerto a través de 'process.env.PORT'.
// Si no existe (porque estamos corriendo en nuestra PC), usará el 4242.
const PORT = process.env.PORT || 4242;

app.listen(PORT, () => {
  console.log(`Servidor de BigFood escuchando en el puerto ${PORT}`);
  console.log('¡Listo para recibir solicitudes de pago desde la app!');
});

    
