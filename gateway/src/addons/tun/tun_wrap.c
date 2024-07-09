#include <node_api.h>
#include <linux/if.h>
#include "tun.h"

napi_value TunAlloc(napi_env env, napi_callback_info info) {
    napi_status status;
    size_t argc = 2;
    napi_value args[2];
    char dev[IFNAMSIZ];
    int fd;

    status = napi_get_cb_info(env, info, &argc, args, NULL, NULL);
    if (status != napi_ok) {
        napi_throw_error(env, NULL, "Failed to parse arguments");
        return NULL;
    }

    if (argc < 2) {
        napi_throw_error(env, NULL, "Wrong number of arguments");
        return NULL;
    }

    status = napi_get_value_string_utf8(env, args[0], dev, IFNAMSIZ, NULL);
    if (status != napi_ok) {
        napi_throw_error(env, NULL, "Invalid device name");
        return NULL;
    }

    status = napi_get_value_int32(env, args[1], &fd);
    if (status != napi_ok) {
        napi_throw_error(env, NULL, "Invalid file descriptor");
        return NULL;
    }

    int result = tun_alloc(dev, fd);

    napi_value napi_result;
    status = napi_create_int32(env, result, &napi_result);
    if (status != napi_ok) {
        napi_throw_error(env, NULL, "Unable to create return value");
        return NULL;
    }

    return napi_result;
}

napi_value Init(napi_env env, napi_value exports) {
    napi_status status;
    napi_value fn;

    status = napi_create_function(env, NULL, 0, TunAlloc, NULL, &fn);
    if (status != napi_ok) {
        napi_throw_error(env, NULL, "Unable to wrap native function");
    }

    status = napi_set_named_property(env, exports, "tunAlloc", fn);
    if (status != napi_ok) {
        napi_throw_error(env, NULL, "Unable to populate exports");
    }

    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
