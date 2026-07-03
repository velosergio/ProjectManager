// Tipos compartidos por los componentes del listado y los formularios de
// clientes (datos ya serializados desde los RSC).

export interface TagOption {
  id: string;
  name: string;
}

/// Fila del listado de clientes (salida de `listClients`).
export interface ClientListRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tags: TagOption[];
  _count: { projects: number };
}
