import type { PublicError } from '../domain/types'

export class TransportError extends Error {
  readonly publicError: PublicError
  readonly httpStatus?: number

  constructor(publicError: PublicError, httpStatus?: number) {
    super(publicError.message)
    this.name = 'TransportError'
    this.publicError = publicError
    this.httpStatus = httpStatus
  }
}

export function validationError(message: string, code = 'validation'): TransportError {
  return new TransportError({ code, message, retryable: false }, 422)
}

export function notFoundError(message: string): TransportError {
  return new TransportError({ code: 'not_found', message, retryable: false }, 404)
}

export function conflictError(message: string, code = 'conflict'): TransportError {
  return new TransportError({ code, message, retryable: false }, 409)
}

export function unavailableError(message: string): TransportError {
  return new TransportError({ code: 'unavailable', message, retryable: true }, 503)
}

export function normalizeHttpError(status: number, body: unknown): TransportError {
  const parsed = body as { error?: PublicError } | null
  if (parsed?.error?.code && parsed.error.message) {
    return new TransportError(parsed.error, status)
  }
  if (status === 404) return notFoundError('Run or resource not found.')
  if (status === 409) return conflictError('The meeting state changed. Refresh and try again.')
  if (status === 400 || status === 422) return validationError('The request was rejected by the service.')
  if (status >= 500) return unavailableError('The roundtable service is temporarily unavailable.')
  return unavailableError(`Unexpected HTTP status ${status}.`)
}
