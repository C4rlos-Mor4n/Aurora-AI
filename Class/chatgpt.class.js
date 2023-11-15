const { convertAudio } = require("./components/convertidor-audio");
const { transcribeAudio } = require("./components/voz-a-texto");
const createImageOpenAI = require("../imgcreate");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const { CoreClass } = require("@bot-whatsapp/bot");
const ProgressBar = require("cli-progress");
const { Spinner } = require("cli-spinner");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const colors = require("colors");
const figlet = require("figlet");
require("dotenv").config();

class chatGPTclass extends CoreClass {
  queue = [];
  optionsGPT = { model: "gpt-4" };
  openai = undefined;

  constructor(_database, _provider) {
    super(null, _database, _provider);
    this._provider = _provider;
    this.init().then();
  }

  init = async () => {
    const { default: boxen } = await import("boxen");

    console.log(
      colors.green(
        figlet.textSync("By Carlos", {
          font: "Star Wars",
          horizontalLayout: "full",
        })
      )
    );

    console.log(
      boxen(colors.green("Inicializando IA..."), {
        padding: 1,
        borderColor: "green",
        borderStyle: "double",
      })
    );
    const { default: ora } = await import("ora");
    const spinner = ora({ spinner: "dots", color: "green" }).start();

    const { ChatGPTAPI } = await import("chatgpt");
    this.openai = new ChatGPTAPI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    spinner.succeed(colors.green("IA inicializado correctamente"));
  };

  async _downloadFile(ctx) {
    const buffer = await downloadMediaMessage(ctx, "buffer");
    return buffer;
  }

  async _handleAudioMessage(ctx) {
    const buffer = await this._downloadFile(ctx);
    const audioDirectory = path.resolve(__dirname, "audio");
    if (!fs.existsSync(audioDirectory)) {
      console.log(colors.green("Creando directorio de audio..."));
      await fs.promises.mkdir(audioDirectory);
    }

    const filePath = path.resolve(audioDirectory, `${ctx.from}.ogg`);
    await fs.promises.writeFile(filePath, buffer);

    const bar = new ProgressBar.SingleBar(
      {
        format: colors.green("Transcribiendo |{bar}| {percentage}%"),
      },
      ProgressBar.Presets.shades_classic
    );
    bar.start(100, 0);

    const fileoggToMp3 = await convertAudio(filePath);
    bar.update(50);
    const transcription = await transcribeAudio(fileoggToMp3);
    bar.update(100);
    bar.stop();

    return transcription?.text;
  }

  handleMsg = async (ctx) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (/^_event_media_/.test(ctx.body)) {
      return;
    }

    if (/^_event_voice_note/.test(ctx.body)) {
      const transcribedText = await this._handleAudioMessage(ctx);

      // Si la transcripción incluye una solicitud para crear una imagen
      if (transcribedText.toLowerCase().includes("crea una imagen")) {
        console.log(
          colors.green(
            "Solicitud de generación de imagen recibida a partir de la transcripción del audio.\n"
          )
        );

        const { default: boxen } = await import("boxen");

        console.log(
          boxen(
            colors.green(`Prompt recibido de ${ctx.from}: ${transcribedText}`),
            {
              padding: 1,
              borderColor: "green",
              borderStyle: "double",
            }
          )
        );

        const bar = new ProgressBar.SingleBar(
          {
            format: colors.green("Generando Imagen |{bar}| {percentage}%"),
          },
          ProgressBar.Presets.shades_classic
        );
        bar.start(100, 0);

        bar.update(25);

        const GenerateImage = await createImageOpenAI(
          transcribedText,
          this._provider,
          ctx
        );
        bar.update(50);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        bar.update(75);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        bar.update(100);
        bar.stop();

        console.log(colors.green("Imagen generada exitosamente."));

        const spinnerSend = new Spinner({
          text: colors.green("Enviando imagen... %s"),
          spinner: "dots", // este spinner da la impresión de girar en círculo
          interval: 80,
        });

        spinnerSend.start();

        await this._provider.sendMedia(
          `${ctx.from}@s.whatsapp.net`,
          GenerateImage,
          "*Prompt:* " + transcribedText,
          ctx
        );
        spinnerSend.stop(true);
        console.log(colors.green("Imagen enviada exitosamente."));
        return;
      } else {
        // Procesar el texto transcribido como un mensaje normal
        ctx.body = transcribedText;
      }
    }

    if (/^\/image/.test(ctx.body)) {
      console.log(colors.green("Solicitud de generación de imagen recibida."));

      const messageWithoutPrefix = ctx.body.replace(/^\/image\s*/, "");

      const { default: boxen } = await import("boxen");

      console.log(
        boxen(
          colors.green(
            `Prompt recibido de ${ctx.from}: ${messageWithoutPrefix}`
          ),
          {
            padding: 1,
            borderColor: "green",
            borderStyle: "double",
          }
        )
      );

      const bar = new ProgressBar.SingleBar(
        {
          format: colors.green("Generando Imagen |{bar}| {percentage}%"),
        },
        ProgressBar.Presets.shades_classic
      );
      bar.start(100, 0);

      bar.update(25);

      const GenerateImage = await createImageOpenAI(
        messageWithoutPrefix,
        this._provider,
        ctx
      );
      bar.update(50);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      bar.update(75);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      bar.update(100);
      bar.stop();

      console.log(colors.green("Imagen generada exitosamente."));

      const spinnerSend = new Spinner({
        text: colors.green("Enviando imagen... %s"),
        spinner: "dots", // este spinner da la impresión de girar en círculo
        interval: 80,
      });

      spinnerSend.start();

      await this._provider.sendMedia(
        `${ctx.from}@s.whatsapp.net`,
        GenerateImage,
        "*Prompt:* " + messageWithoutPrefix,
        ctx
      );
      spinnerSend.stop(true);
      console.log(colors.green("Imagen enviada exitosamente."));
      return;
    }

    if (/^_event_voice_note/.test(ctx.body)) {
      ctx.body = await this._handleAudioMessage(ctx);
    }

    const { from, body } = ctx;
    const { default: boxen } = await import("boxen");

    console.log(
      boxen(colors.green(`Mensaje recibido de ${from}: ${body}`), {
        padding: 1,
        borderColor: "green",
        borderStyle: "double",
      })
    );

    const lastMessage = this.queue[this.queue.length - 1] || {};

    const spinner = new Spinner({
      text: colors.green("Procesando mensaje con IA... %s"),
      spinner: {
        frames: ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "▉"],
        interval: 80,
      },
    });

    spinner.start();

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const completada = await this.openai.sendMessage(body, {
      conversationId: lastMessage.conversationId,
      parentMessageId: lastMessage.id,
    });
    spinner.stop(true);

    console.log(colors.green("✔ Respuesta de IA obtenida."));
    console.log(
      colors.green(`ID de mensaje padre: ${completada.parentMessageId}`)
    );
    this.queue.push(completada);
    if (this.queue.length > 10) {
      console.log(
        colors.green(
          `Eliminando mensajes antiguos de la cola. Tamaño de la cola: ${this.queue.length}`
        )
      );
      this.queue.shift();
    }

    const parseMessage = {
      ...completada,
      answer: completada.text,
    };

    console.log(
      boxen(colors.green(`Enviando respuesta a ${from}: ${completada.text}`), {
        padding: 1,
        borderColor: "green",
        borderStyle: "double",
      })
    );

    const responseGpt = await parseMessage.answer;
    await this._provider.sendTextCustom(
      `${from}@s.whatsapp.net`,
      responseGpt,
      ctx
    );
  };
}

module.exports = chatGPTclass;
