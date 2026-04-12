const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs');

async function removeBackground(imageBuffer) {
  const formData = new FormData();
  formData.append('image_file', imageBuffer, {
    filename: 'image.jpg',
    contentType: 'image/jpeg',
  });
  formData.append('size', 'auto');

  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: {
      'X-Api-Key': process.env.REMOVEBG_API_KEY,
      ...formData.getHeaders(),
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Remove.bg error: ${error.errors?.[0]?.title}`);
  }

  // Retourne un Buffer PNG avec fond transparent
  return Buffer.from(await response.arrayBuffer());
}

module.exports = { removeBackground };