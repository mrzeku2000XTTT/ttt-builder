// Standalone stub for the Base44 SDK.
// Lets TTT Builder run with NO Base44 platform. The core build loop uses YOUR
// OWN model keys (Open Models tab / localLlm.js) and never touches this file.
// These stubs cover optional platform features (live sandbox, image gen,
// github push, auth) and degrade gracefully when unavailable.

const LOCAL_ADMIN = { id: "local", email: "local@ttt-builder", role: "admin", username: "local" };

function unavailable(name, hint) {
  return async () => {
    throw new Error(name + " is not available in this self-hosted build. " + (hint || "See README."));
  };
}

export const base44 = {
  auth: {
    me: async () => LOCAL_ADMIN,
    isAuthenticated: async () => true,
    logout: async () => {},
    updateMe: async (d) => ({ ...LOCAL_ADMIN, ...d }),
    redirectToLogin: () => {},
  },
  functions: {
    invoke: async (name) => {
      throw new Error('Backend function "' + name + '" is not available without the Base44 platform. See README.');
    },
  },
  integrations: {
    Core: {
      GenerateImage: unavailable("GenerateImage", "Plug your own image API into src/components/tttbuilder/imageGen.js, or TTT_IMAGE markers are cleared."),
      UploadFile: unavailable("UploadFile"),
      InvokeLLM: unavailable("InvokeLLM", "Add an open model in the Open Models tab — hosted models need the Base44 platform."),
      GenerateSpeech: unavailable("GenerateSpeech"),
      GenerateVideo: unavailable("GenerateVideo"),
      TranscribeAudio: unavailable("TranscribeAudio"),
      ExtractDataFromUploadedFile: unavailable("ExtractDataFromUploadedFile"),
      CreateFileSignedUrl: unavailable("CreateFileSignedUrl"),
      UploadPrivateFile: unavailable("UploadPrivateFile"),
    },
  },
  entities: new Proxy({}, {
    get: () => ({
      list: async () => [],
      filter: async () => [],
      get: async () => null,
      create: async (d) => d,
      update: async () => ({}),
      delete: async () => ({}),
      bulkCreate: async (a) => a,
      bulkUpdate: async (a) => a,
      updateMany: async () => ({}),
      deleteMany: async () => ({}),
      subscribe: () => () => {},
      schema: () => ({}),
    }),
  }),
  analytics: { track: () => {} },
  users: { inviteUser: unavailable("inviteUser") },
  asServiceRole: { connectors: { getConnection: unavailable("getConnection") } },
};
