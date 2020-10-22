const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.on("text", async function (ctx) {
  const { text } = ctx.message;
  ctx.reply("It was: " + text);
});

bot.launch();
