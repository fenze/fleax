let currentEffect: (() => void) | null = null;
const effectStack: (() => void)[] = [];

export type Ref<T> = {
	value: T;
	toString(): string;
};

export const ref = <T>(val: T): Ref<T> => {
	const subs = new Set<() => void>();
	return {
		get value() {
			if (currentEffect) subs.add(currentEffect);
			return val;
		},
		set value(n: T) {
			if (val !== n) {
				val = n;
				for (const s of subs) {
					s();
				}
			}
		},
		toString() {
			return String(val);
		},
	};
};

export const computed = <T>(fn: () => T): Ref<T> => {
	const dep = ref(fn());
	effect(() => {
		dep.value = fn();
	});
	return dep;
};

export const effect = (fn: () => void) => {
	const execute = () => {
		effectStack.push(execute);
		currentEffect = execute;
		fn();
		currentEffect = null;
		effectStack.pop();
	};
	execute();
};

export const getCurrentEffect = () => currentEffect;
export const setCurrentEffect = (fn: (() => void) | null) => {
	currentEffect = fn;
};
