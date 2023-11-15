const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const Queue = require("queue-promise");
require("dotenv").config();

// Crea una instancia de la cola con un intervalo de 3 segundos
const transcriptionQueue = new Queue({
  concurrent: 1,
  interval: 3000,
});

async function transcribeAudio(filePath) {
  return new Promise((resolve, reject) => {
    transcriptionQueue.enqueue(async () => {
      const unixFilePath = filePath.substring(2).replace(/\\/g, "/");
      let data = new FormData();
      data.append("model", "whisper-1");
      data.append("file", fs.createReadStream(unixFilePath));
      data.append("language", "es"); // Especificar el idioma como español

      let config = {
        method: "post",
        maxBodyLength: Infinity,
        url: "https://api.openai.com/v1/audio/transcriptions",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          ...data.getHeaders(),
        },
        data: data,
      };

      try {
        const response = await axios(config);
        resolve(response.data);
      } catch (error) {
        console.error(error);
        reject(error);
      }
    });
  });
}

module.exports = {
  transcribeAudio,
};
