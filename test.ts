async function run() {
  const res = await fetch('https://openrouter.ai/api/v1/models');
  console.log('OpenRouter:', await res.text());
}
run();
