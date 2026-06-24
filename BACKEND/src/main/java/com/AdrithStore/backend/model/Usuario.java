package com.AdrithStore.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Integer idUsuario;

    @Column(name = "username", unique = true, nullable = false, length = 50)
    private String username;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    // ADMIN | VENDEDOR
    @Column(name = "rol", nullable = false, length = 20)
    private String rol = "VENDEDOR";

    @Column(name = "nombres", nullable = false, length = 100)
    private String nombres;

    @Column(name = "apellidos", nullable = false, length = 100)
    private String apellidos;

    @Column(name = "dni", unique = true, length = 15)
    private String dni;

    @Column(name = "telefono", length = 20)
    private String telefono;

    @Column(name = "activo")
    private Boolean activo = true;

    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    @Column(name = "creado_por", length = 50)
    private String creadoPor;

    public String getNombreCompleto() {
        return nombres + " " + apellidos;
    }
}