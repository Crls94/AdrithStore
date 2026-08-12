package com.AdrithStore.backend.security;

// Principal autenticado que viaja en el SecurityContext de cada request,
// poblado por JwtAuthFilter a partir de los claims del JWT.
public record AuthenticatedUser(Integer idUsuario, String username, String rol) {
}
