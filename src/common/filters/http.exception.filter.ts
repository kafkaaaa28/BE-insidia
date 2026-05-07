import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const isHttpException = exception instanceof HttpException;
    console.log('Exception caught by HttpExceptionFilter:', {
      message: isHttpException ? exception.message : String(exception),
      stack: isHttpException ? exception.stack : undefined,
      exception,
      status: isHttpException ? exception.getStatus() : undefined,
    });
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;

    const errorBody = this.normalizeError(status, exceptionResponse);

    response.status(status).json({
      error: errorBody,
    });
  }

  private normalizeError(status: number, exceptionResponse: unknown) {
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const res = exceptionResponse as Record<string, any>;

      return {
        code: res.code ?? this.mapStatusToCode(status),
        message: Array.isArray(res.message)
          ? 'Data tidak valid'
          : (res.message ?? this.mapStatusToMessage(status)),
        details: Array.isArray(res.message) ? res.message : res.details,
        status: status,
      };
    }

    return {
      code: this.mapStatusToCode(status),
      message:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : this.mapStatusToMessage(status),
      status: status,
    };
  }

  private mapStatusToCode(status: number) {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      default:
        return 'INTERNAL_ERROR';
    }
  }

  private mapStatusToMessage(status: number) {
    switch (status) {
      case 400:
        return 'Request tidak valid';
      case 401:
        return 'Unauthorized';
      case 403:
        return 'Forbidden';
      case 404:
        return 'Resource tidak ditemukan';
      case 409:
        return 'Terjadi konflik data';
      default:
        return 'Terjadi kesalahan server';
    }
  }
}
