require("dotenv").config();
const Queue = require("queue-promise");
const OpenAI = require("openai");

// Configura la cola para manejar tareas asíncronas con un intervalo de 3 segundos
const queue = new Queue({
  concurrent: 1,
  interval: 3000,
});

function createImageOpenAI(text, _provider, ctx) {
  return new Promise((resolve, reject) => {
    // Encola la función asíncrona
    queue.enqueue(async () => {
      try {
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: text,
        });

        const imageUrl = response.data[0].url;
        resolve(imageUrl);
      } catch (error) {
        console.error("Error details:", error.response?.data || error.message);
        await _provider.sendTextCustom(
          `${ctx.from}@s.whatsapp.net`,
          "Rompe las reglas de generacion de imagenes de openai, prueba con otro prompt",
          ctx
        );
      }
    });
  });
}

module.exports = createImageOpenAI;
