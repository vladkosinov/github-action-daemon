const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.on("text", async function (ctx) {
  const { text } = ctx.message;
  console.log("Text received", text);
  ctx.reply("You said this: " + text);
});

bot.launch();

process.on('SIGTERM', () => {
  console.log('Thanks, bye!');
  process.exit(0)
});
