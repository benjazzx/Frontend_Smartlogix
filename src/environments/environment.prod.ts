const apiGateway = 'https://g6w6vs8mph.execute-api.us-east-1.amazonaws.com';

export const environment = {
  production: true,
  apiGateway,
  cognito: {
    domain: 'https://smartlogix-730335547979.auth.us-east-1.amazoncognito.com',
    clientId: '39hqk14upce1u4f3ps9dveh7br',
    redirectUri: 'https://smart-logix-rho.vercel.app',
    scope: 'openid email profile',
  },
  direccionPredeterminadaId: '55994963-fd81-4ff8-89d6-92c767fcfeb5',
  services: {
    auth:        `${apiGateway}/auth`,
    registro:    `${apiGateway}/auth/register`,
    usuarios:    `${apiGateway}/api/users`,
    direcciones: `${apiGateway}/api/direcciones`,
    regiones:    `${apiGateway}/api/regiones`,
    comunas:     `${apiGateway}/api/comunas`,
    roles:       `${apiGateway}/api/roles`,
    productos:   `${apiGateway}/api/productos`,
    categorias:  `${apiGateway}/api/categorias`,
    ordenes:     `${apiGateway}/api/ordenes`,
    envios:      `${apiGateway}/api/ordenes`,
    estados:     `${apiGateway}/api/estados`,
    tiposEstado: `${apiGateway}/api/tipos-estado`,
    inventarioBodegas:  `${apiGateway}/api/inventario/bodegas`,
    inventarioPasillos: `${apiGateway}/api/inventario/pasillos`,
    inventarioEstantes: `${apiGateway}/api/inventario/estantes`,
    inventarioEstPasi:  `${apiGateway}/api/inventario/est-pasi`,
  },
};
