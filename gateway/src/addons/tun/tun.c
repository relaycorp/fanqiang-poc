#include <linux/if.h>
#include <linux/if_tun.h>
#include <string.h>
#include <sys/ioctl.h>
#include "tun.h"

int tun_alloc(char *dev, int fd)
{
    struct ifreq request;
    int errorCode;

    if (!dev) {
        return 1;
    }
    if (fd < 0) {
        return 2;
    }

    memset(&request, 0, sizeof(request));
    request.ifr_flags = IFF_TUN | IFF_NO_PI;
    strncpy(request.ifr_name, dev, IFNAMSIZ - 1);

    errorCode = ioctl(fd, TUNSETIFF, (void *) &request);
    if (errorCode < 0) {
        return errorCode;
    }

    return 0;
}
