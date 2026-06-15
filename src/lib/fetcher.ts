import axios, { AxiosError } from 'axios';

const USER_AGENT = 'carta-cli/0.1.0 (https://github.com/JakPot42/carta; open standard for platform accountability)';
const TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

export class FetchError extends Error {
  constructor(public readonly url: string, public readonly statusCode: number | null, message: string) {
    super(message);
    this.name = 'FetchError';
  }
}

export async function fetchPage(url: string): Promise<string> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: TIMEOUT_MS,
        maxRedirects: 5,
      });
      return response.data as string;
    } catch (err) {
      const axiosErr = err as AxiosError;
      const status = axiosErr.response?.status ?? null;

      if (status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = parseInt(axiosErr.response?.headers['retry-after'] as string ?? '5', 10);
        await sleep(retryAfter * 1000);
        continue;
      }

      if (attempt < MAX_RETRIES && !status) {
        await sleep(2000);
        continue;
      }

      throw new FetchError(url, status, `Failed to fetch ${url}: ${axiosErr.message}`);
    }
  }
  throw new FetchError(url, null, `Failed to fetch ${url} after ${MAX_RETRIES} retries`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
