export interface CodeFile {
  path: string;
  language: string;
  description: string;
  content: string;
}

export const FLUTTER_FIREBASE_FILES: CodeFile[] = [
  {
    path: 'lib/domain/repositories/task_repository.dart',
    language: 'dart',
    description: 'Repositorio de Tareas Diarias con sincronización en tiempo real y persistencia local activa.',
    content: `import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:vinculo/domain/entities/tarea_diaria.dart';

abstract class TaskRepository {
  Stream<List<TareaDiaria>> watchDailyTasks(String userId, String familyId);
  Future<void> updateTaskStatus(String taskId, String newStatus);
  Future<void> createTask(TareaDiaria task);
}

class FirebaseTaskRepository implements TaskRepository {
  final FirebaseFirestore _firestore;

  FirebaseTaskRepository({FirebaseFirestore? firestore}) 
      : _firestore = firestore ?? FirebaseFirestore.instance {
    // Configurar persistencia offline local
    _firestore.settings = const Settings(
      persistenceEnabled: true,
      cacheSizeBytes: Settings.CACHE_SIZE_UNLIMITED,
    );
  }

  @override
  Stream<List<TareaDiaria>> watchDailyTasks(String userId, String familyId) {
    // Escucha en tiempo real (snapshots) uniendo filtros de visibilidad y familia
    return _firestore
        .collection('tareas_diarias')
        .where('visible_familia', isEqualTo: true)
        .snapshots()
        .map((snapshot) {
          return snapshot.docs
              .map((doc) => TareaDiaria.fromFirestore(doc.data(), doc.id))
              .where((task) => task.usuarioId == userId || task.visibleFamilia == true)
              .toList();
        });
  }

  @override
  Future<void> updateTaskStatus(String taskId, String newStatus) async {
    try {
      await _firestore.collection('tareas_diarias').doc(taskId).update({
        'estado': newStatus,
        'ultima_actualizacion': FieldValue.serverTimestamp(), // TIMESTAMP DE SERVIDOR
      });
    } on FirebaseException catch (e) {
      throw _handleFirestoreError(e);
    }
  }

  @override
  Future<void> createTask(TareaDiaria task) async {
    try {
      await _firestore.collection('tareas_diarias').add({
        ...task.toFirestore(),
        'ultima_actualizacion': FieldValue.serverTimestamp(), // SIEMPRE SERVER TIMESTAMP
      });
    } on FirebaseException catch (e) {
      throw _handleFirestoreError(e);
    }
  }

  Exception _handleFirestoreError(FirebaseException e) {
    switch (e.code) {
      case 'permission-denied':
        return Exception('Error de seguridad: No tienes permisos para realizar esta acción.');
      case 'unavailable':
        return Exception('El servicio de base de datos no está disponible temporalmente.');
      default:
        return Exception('Error de sincronización (\\\${e.code}): \\\${e.message}');
    }
  }
}`
  },
  {
    path: 'lib/domain/repositories/saving_repository.dart',
    language: 'dart',
    description: 'Repositorio de Sobres de Ahorro con transacciones de Firebase para evitar colisiones entre miembros de familia.',
    content: `import 'package:cloud_firestore/cloud_firestore.dart';

abstract class SavingRepository {
  Future<void> contributeToEnvelope(String sobreId, String userId, double amount);
}

class FirebaseSavingRepository implements SavingRepository {
  final FirebaseFirestore _firestore;

  FirebaseSavingRepository({FirebaseFirestore? firestore})
      : _firestore = firestore ?? FirebaseFirestore.instance;

  @override
  Future<void> contributeToEnvelope(String sobreId, String userId, double amount) async {
    final DocumentReference sobreRef = _firestore.collection('ahorro').doc(sobreId);

    // Evita condiciones de carrera usando transacciones nativas de Firestore
    return _firestore.runTransaction((transaction) async {
      final DocumentSnapshot sobreSnapshot = await transaction.get(sobreRef);

      if (!sobreSnapshot.exists) {
        throw Exception("El sobre de ahorro seleccionado no existe.");
      }

      final double currentAmount = (sobreSnapshot.get('monto_actual') as num).toDouble();
      final double targetAmount = (sobreSnapshot.get('monto_meta') as num).toDouble();
      final List<dynamic> currentAportes = List.from(sobreSnapshot.get('aportes') ?? []);

      final double newAmount = currentAmount + amount;

      // Actualizar datos de forma atómica en la transacción
      transaction.update(sobreRef, {
        'monto_actual': newAmount,
        'aportes': FieldValue.arrayUnion([
          {
            'usuario_id': userId,
            'monto': amount,
            'fecha': DateTime.now().toUtc().toIso8601String(),
          }
        ]),
        'ultima_actualizacion': FieldValue.serverTimestamp(), // TIMESTAMP DE SERVIDOR
      });
    }).catchError((error) {
      throw Exception("Fallo en la transacción de ahorro: \${error.toString()}");
    });
  }
}`
  },
  {
    path: 'firebase/firestore.rules',
    language: 'javascript',
    description: 'Reglas de seguridad robustas de Firestore para proteger la privacidad familiar y forzar control vía Custom Claims.',
    content: `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: Verifica si el usuario está autenticado
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper: Verifica si el usuario tiene rol de Administrador Global vía Custom Claims
    function isAdmin() {
      return isAuthenticated() && request.auth.token.admin == true;
    }

    // Helper: Verifica que el usuario pertenezca al mismo ID de familia
    function isSameFamily(familyId) {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.familia_id == familyId;
    }

    // Helper: Obtiene la familia de un usuario dado
    function getUserFamily(uid) {
      return get(/databases/$(database)/documents/usuarios/$(uid)).data.familia_id;
    }

    // REGLA GLOBAL ADMIN: Acceso total al Administrador
    match /{document=**} {
      allow read, write: if isAdmin();
    }

    // COLECCIÓN: USUARIOS
    match /usuarios/{uid} {
      // Cualquier miembro de la familia puede leer la info de perfil
      allow read: if isAuthenticated() && (request.auth.uid == uid || getUserFamily(request.auth.uid) == resource.data.familia_id);
      // Solo el usuario puede modificar su configuración básica (EXCEPTO puntos y racha_actual)
      allow create, update: if isAuthenticated() && request.auth.uid == uid 
        && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['puntos', 'racha_actual']);
    }

    // COLECCIÓN: FAMILIAS
    match /familias/{familyId} {
      allow read: if isAuthenticated() && (isSameFamily(familyId) || isAdmin());
      allow write: if isAdmin(); // Solo admin gestiona familias globalmente
    }

    // COLECCIÓN: METAS
    match /metas/{metaId} {
      // El dueño o miembros de la misma familia (si es visible) pueden leer
      allow read: if isAuthenticated() && (
        request.auth.uid == resource.data.usuario_id || 
        (resource.data.visible_familia == true && getUserFamily(request.auth.uid) == getUserFamily(resource.data.usuario_id))
      );
      // Solo el dueño puede crear o actualizar sus metas
      allow write: if isAuthenticated() && request.auth.uid == request.resource.data.usuario_id;
    }

    // COLECCIÓN: TAREAS DIARIAS
    match /tareas_diarias/{tareaId} {
      allow read: if isAuthenticated() && (
        request.auth.uid == resource.data.usuario_id ||
        (resource.data.visible_familia == true && getUserFamily(request.auth.uid) == getUserFamily(resource.data.usuario_id))
      );
      // Solo el dueño puede crear/editar sus tareas diarias
      allow write: if isAuthenticated() && request.auth.uid == request.resource.data.usuario_id;
    }

    // COLECCIÓN: DIARIO
    match /diario/{entradaId} {
      // El diario solo puede ser leído por miembros si visible_familia es true
      allow read: if isAuthenticated() && (
        request.auth.uid == resource.data.usuario_id ||
        (resource.data.visible_familia == true && getUserFamily(request.auth.uid) == getUserFamily(resource.data.usuario_id))
      );
      // Solo el dueño escribe en su diario
      allow write: if isAuthenticated() && request.auth.uid == request.resource.data.usuario_id;
    }

    // COLECCIÓN: AHORRO
    match /ahorro/{sobreId} {
      // Lectura si pertenece a la familia
      allow read: if isAuthenticated() && isSameFamily(resource.data.familia_id);
      // Escritura atómica si el sobre pertenece a la familia del miembro
      allow write: if isAuthenticated() && isSameFamily(request.resource.data.familia_id);
    }
  }
}`
  },
  {
    path: 'firebase/functions/index.js',
    language: 'javascript',
    description: 'Cloud Functions para control administrativo (Custom Claims), verificación de tareas diarias atrasadas y rotación de frases.',
    content: `const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

/**
 * 1. Cloud Function ejecutada de forma manual para asignar el Custom Claim de Administrador.
 * Protegida para evitar que cualquier usuario pueda autoinvocarse o autoasignarse.
 */
exports.assignAdminClaim = functions.https.onCall(async (data, context) => {
  // Asegurar que el que la llama es el propietario del proyecto verificado por CLI o tiene permisos de administración previos
  // En producción, se verifica que la llamada venga de una cuenta de servicio o UID pre-aprobado.
  const callerUid = context.auth ? context.auth.uid : null;
  const targetUid = data.uid;

  if (!targetUid) {
    throw new functions.https.HttpsError('invalid-argument', 'El UID destino es obligatorio.');
  }

  // UID Pre-aprobado del desarrollador principal (configurado por el propietario)
  const MASTER_OWNER_EMAIL = "elcast1g4dor009@gmail.com";
  
  if (context.auth && context.auth.token.email !== MASTER_OWNER_EMAIL) {
    throw new functions.https.HttpsError('permission-denied', 'No estás autorizado para asignar claims de administrador.');
  }

  try {
    await admin.auth().setCustomUserClaims(targetUid, { admin: true });
    // Actualizar también en firestore para indexado
    await admin.firestore().collection('usuarios').doc(targetUid).set({
      role: 'admin',
      puntos: 99999,
      ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return { success: true, message: \`Custom Claim {admin: true} asignado exitosamente al UID: \${targetUid}\` };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * 2. Scheduled Cron Job (Ejecutado cada 5 minutos)
 * Revisa tareas_diarias: si pasó su hora y estimada duración y sigue pendiente, cambia a "vencido".
 */
exports.verifyOverdueTasks = functions.pubsub.schedule('*/5 * * * *').onRun(async (context) => {
  const db = admin.firestore();
  const now = new Date();
  
  // Obtener hora actual en formato minutos del día para comparar
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const querySnapshot = await db.collection('tareas_diarias')
    .where('estado', 'in', ['pendiente', 'en_progreso'])
    .get();

  const batch = db.batch();
  let updatedCount = 0;

  querySnapshot.forEach(doc => {
    const data = doc.data();
    const [hora, min] = data.hora_programada.split(':').map(Number);
    const taskMinutes = hora * 60 + min;
    const estimatedEndMinutes = taskMinutes + (data.tiempo_estimado_min || 30);

    // Si la hora actual ya superó el tiempo programado más la duración estimada, está vencido
    if (currentMinutes > estimatedEndMinutes) {
      batch.update(doc.ref, {
        'estado': 'vencido',
        'ultima_actualizacion': admin.firestore.FieldValue.serverTimestamp()
      });
      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    await batch.commit();
  }
  
  console.log(\`Verificación de tareas finalizada. \${updatedCount} tareas cambiaron a estado 'vencido'.\`);
  return null;
});

/**
 * 3. Scheduled Cron Job a Medianoche
 * Selecciona la frase del día rotando el banco de frases para evitar repeticiones.
 */
exports.rotateQuoteOfTheDay = functions.pubsub.schedule('0 0 * * *').onRun(async (context) => {
  const db = admin.firestore();
  
  // Obtener todas las frases disponibles
  const frasesSnapshot = await db.collection('frases').get();
  const frases = [];
  frasesSnapshot.forEach(doc => {
    frases.push({ id: doc.id, ...doc.data() });
  });

  if (frases.length === 0) return null;

  // Obtener el historial de frases usadas para evitar repetición continua
  const historialSnapshot = await db.collection('frase_del_dia')
    .orderBy('fecha', 'desc')
    .limit(frases.length - 1)
    .get();

  const frasesUsadasIds = new Set();
  historialSnapshot.forEach(doc => {
    frasesUsadasIds.add(doc.data().frase_id);
  });

  // Filtrar frases no repetidas
  let frasesDisponibles = frases.filter(f => !frasesUsadasIds.has(f.id));
  
  // Si se agotaron todas las frases del banco, reiniciar ciclo
  if (frasesDisponibles.length === 0) {
    frasesDisponibles = frases;
  }

  // Selección aleatoria
  const fraseSeleccionada = frasesDisponibles[Math.floor(Math.random() * frasesDisponibles.length)];

  const hoyFormateado = new Date().toISOString().split('T')[0];

  // Guardar frase seleccionada
  await db.collection('frase_del_dia').doc(hoyFormateado).set({
    fecha: hoyFormateado,
    frase_id: fraseSeleccionada.id,
    texto: fraseSeleccionada.texto,
    autor: fraseSeleccionada.autor,
    ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(\`Frase del día rotada correctamente: "\${fraseSeleccionada.texto}"\`);
  return null;
});`
  },
  {
    path: 'lib/core/architecture_blueprint.md',
    language: 'markdown',
    description: 'Estructura de Carpetas Clean Architecture para Flutter (Módulos Separados por Dominio).',
    content: `estructuras_carpetas/
├── lib/
│   ├── core/
│   │   ├── error/
│   │   │   └── failures.dart
│   │   ├── network/
│   │   │   └── network_info.dart
│   │   └── theme/
│   │       └── colors.dart
│   ├── features/
│   │   ├── auth/
│   │   │   ├── data/
│   │   │   │   ├── datasources/
│   │   │   │   │   ├── auth_local_datasource.dart
│   │   │   │   │   └── auth_remote_datasource.dart
│   │   │   │   └── repositories/
│   │   │   │       └── auth_repository_impl.dart
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   └── user_entity.dart
│   │   │   │   ├── repositories/
│   │   │   │   │   └── auth_repository.dart
│   │   │   │   └── usecases/
│   │   │   │       └── login_with_google.dart
│   │   │   └── presentation/
│   │   │       ├── bloc/
│   │   │       │   └── auth_bloc.dart
│   │   │       └── pages/
│   │   │           └── login_page.dart
│   │   ├── hoy/
│   │   ├── metas/
│   │   ├── familia/
│   │   ├── ahorro/
│   │   ├── diario/
│   │   └── juegos/
│   └── main.dart
└── pubspec.yaml`
  }
];

export const MANUAL_STEPS = [
  "Crear el proyecto en la consola de Firebase (console.firebase.google.com), añadiendo una aplicación Android e iOS con el ID de paquete idóneo.",
  "Habilitar Cloud Firestore en la pestaña lateral, seleccionando el modo de producción y la región regional más cercana a tu ubicación geográfica.",
  "Habilitar Firebase Authentication y configurar únicamente Google Sign-In como proveedor de inicio de sesión habilitado en la sección 'Sign-in method'.",
  "Registrarse o iniciar sesión por primera vez desde la aplicación cliente con la cuenta de Google que deseas establecer como Administrador Principal de la plataforma. Esto generará el registro del UID único del usuario en la base de datos de Authentication.",
  "Copia ese UID único del Administrador Principal desde la Consola de Firebase en Authentication > Users.",
  "A través del Firebase CLI previamente autenticado en tu terminal, ejecuta de forma segura la Cloud Function 'assignAdminClaim' pasándole el UID copiado para otorgarle los privilegios administrativos { admin: true }.",
  "Verifica la correcta asignación de privilegios ejecutando un script de prueba que demuestre que request.auth.token.admin == true solo para el UID indicado.",
  "Despliega las reglas de Firestore (firestore.rules) y las funciones programadas de rotación de frases y comprobación de tareas atrasadas ejecutando en tu terminal: 'firebase deploy --only firestore:rules,functions'."
];
