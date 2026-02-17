let currentMounts: (() => void)[] | null = null;
let currentCleanups: (() => void)[] | null = null;

export const onMount = (fn: () => void) => {
	if (currentMounts) currentMounts.push(fn);
};

export const onCleanup = (fn: () => void) => {
	if (currentCleanups) currentCleanups.push(fn);
};

export const cleanupMap = new WeakMap<Node, (() => void)[]>();

export const runWithLifecycle = <T>(fn: () => T) => {
	const prevMounts = currentMounts;
	const prevCleanups = currentCleanups;
	const mounts: (() => void)[] = [];
	const cleanups: (() => void)[] = [];
	currentMounts = mounts;
	currentCleanups = cleanups;
	const result = fn();
	currentMounts = prevMounts;
	currentCleanups = prevCleanups;
	return { result, mounts, cleanups };
};

export const getCurrentCleanups = () => currentCleanups;
export const getCurrentMounts = () => currentMounts;
