import type { HuggingFaceUnreachableAnswer } from './types';

/** An answer of the API outside the operation's success, with its status for the error boundary that shows it. */
export class ApiError extends Error {
  readonly status: number;

  /** The API's own account of the failure: its error body's message, else the whole body */
  readonly reason: string;

  constructor(response: Response, body: unknown) {
    super(`${response.status} ${response.url}: ${JSON.stringify(body)}`);
    this.status = response.status;
    this.reason = typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string' ? body.message : JSON.stringify(body);
  }
}

/** The status the spec's HuggingFaceUnreachableError answers with. */
export const HUGGING_FACE_UNREACHABLE_STATUS = 502;

/** The records an operation needs are kept on Hugging Face and could not be read from it; the reader can open them there. */
export class HuggingFaceUnreachableError extends ApiError {
  readonly huggingFaceUrl: string;

  constructor(response: Response, body: HuggingFaceUnreachableAnswer) {
    super(response, body);
    this.huggingFaceUrl = body.huggingFaceUrl;
  }
}
