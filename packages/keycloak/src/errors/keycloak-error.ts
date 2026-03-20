export class KeycloakError extends Error {
  public readonly statusCode?: number;
  public readonly details?: any;
  public readonly keycloakError?: string;

  constructor(
    message: string,
    opts?: { statusCode?: number; details?: any; keycloakError?: string },
  ) {
    super(message);
    this.name = "KeycloakError";
    this.statusCode = opts?.statusCode;
    this.details = opts?.details;
    this.keycloakError = opts?.keycloakError;
    // maintain proper prototype chain
    Object.setPrototypeOf(this, KeycloakError.prototype);
  }
}

export default KeycloakError;
