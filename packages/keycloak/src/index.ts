import { httpGet } from "@backend/http-client";

export function getKeycloakInfo() {
  return httpGet("/keycloak");
}
