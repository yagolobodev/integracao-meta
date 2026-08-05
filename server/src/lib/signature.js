import crypto from 'node:crypto';

/**
 * Valida a assinatura X-Hub-Signature-256 enviada pela Meta em cada webhook.
 * @param {Buffer} rawBody - corpo bruto (não parseado) da requisição.
 * @param {string|undefined} signatureHeader - valor do header X-Hub-Signature-256.
 * @param {string} appSecret - App Secret do app da Meta.
 * @returns {boolean}
 */
export function verifyMetaSignature(rawBody, signatureHeader, appSecret) {
  if (!signatureHeader || !appSecret) return false;

  const [algo, receivedDigest] = signatureHeader.split('=');
  if (algo !== 'sha256' || !receivedDigest) return false;

  const expectedDigest = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  const received = Buffer.from(receivedDigest, 'hex');
  const expected = Buffer.from(expectedDigest, 'hex');

  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(received, expected);
}
