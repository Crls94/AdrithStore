package com.AdrithStore.backend.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "proveedores")
public class Proveedor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_proveedor")
    private Integer idProveedor;

    @Column(name = "empresa", unique = true, nullable = false)
    private String empresa;

    @Column(name = "ruc", unique = true)
    private String ruc;

    @Column(name = "descripcion")
    private String descripcion;

    @Column(name = "emite_percepcion")
    private Boolean emitePercepcion = false;

    @Column(name = "telefono")
    private String telefono;

    @Column(name = "contacto")
    private String contacto;

    @Column(name = "email")
    private String email;
}