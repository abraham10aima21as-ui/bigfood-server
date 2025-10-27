// Importa las librerías necesarias
const express = require('express');
const stripe = require('stripe');
const cors = require('cors');

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

// --- Configuración del Puerto para Render (con fallback para desarrollo local) ---
// Render proveerá el puerto a través de 'process.env.PORT'.
// Si no existe (porque estamos corriendo en nuestra PC), usará el 4242.
const PORT = process.env.PORT || 4242;

app.listen(PORT, () => {
  console.log(`Servidor de BigFood escuchando en el puerto ${PORT}`);
  console.log('¡Listo para recibir solicitudes de pago desde la app!');
});

    
