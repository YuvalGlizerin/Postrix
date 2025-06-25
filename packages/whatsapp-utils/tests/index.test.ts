import { type Request, type Response } from 'express';

import whatsapp from '../src/index.js';

describe('WhatsApp Webhook Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  const mockVerificationToken = 'test_verification_token';

  beforeEach(() => {
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      sendStatus: jest.fn()
    };
  });

  it('should verify webhook with valid token and return challenge', () => {
    mockRequest = {
      query: {
        'hub.mode': 'subscribe',
        'hub.verify_token': mockVerificationToken,
        'hub.challenge': 'test_challenge'
      }
    };

    whatsapp.verifyToken(mockRequest as Request, mockResponse as Response, mockVerificationToken);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.send).toHaveBeenCalledWith('test_challenge');
  });

  it('should reject webhook verification with invalid token', () => {
    mockRequest = {
      query: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong_token',
        'hub.challenge': 'test_challenge'
      }
    };

    whatsapp.verifyToken(mockRequest as Request, mockResponse as Response, mockVerificationToken);

    expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
  });

  it('should reject webhook verification with invalid mode', () => {
    mockRequest = {
      query: {
        'hub.mode': 'invalid_mode',
        'hub.verify_token': mockVerificationToken,
        'hub.challenge': 'test_challenge'
      }
    };

    whatsapp.verifyToken(mockRequest as Request, mockResponse as Response, mockVerificationToken);

    expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
  });
});
