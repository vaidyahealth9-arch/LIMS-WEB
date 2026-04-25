export const normalizeRole = (role: string): string => String(role || '').toUpperCase().replace(/^ROLE_/, '');

export const normalizeRoles = (roles: string[] = []): string[] => roles.map(normalizeRole);

const isDoctorLikeRole = (roles: string[] = []): boolean => {
    const normalized = normalizeRoles(roles);
    return normalized.includes('DOCTOR') || normalized.includes('PATHOLOGIST') || normalized.includes('RADIOLOGIST');
};

const isAdminRole = (roles: string[] = []): boolean => normalizeRoles(roles).includes('ADMIN');

export const canAccessPathForRoles = (path: string, roles: string[] = []): boolean => {
    const normalizedPath = path === '' ? '/' : path;

    if (isAdminRole(roles)) {
        return true;
    }

    if (isDoctorLikeRole(roles)) {
        return normalizedPath === '/entry-verify' || normalizedPath === '/view-observations';
    }

    if (normalizedPath === '/' || normalizedPath === '/lab-management' || normalizedPath === '/user-management') {
        return false;
    }

    return true;
};

export const getDefaultPathForRoles = (roles: string[] = []): string => {
    if (isAdminRole(roles)) {
        return '/';
    }

    if (isDoctorLikeRole(roles)) {
        return '/entry-verify';
    }

    return '/patient-list';
};
