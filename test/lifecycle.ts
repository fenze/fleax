import {
	cleanupMap,
	onCleanup,
	onMount,
	runWithLifecycle,
} from "../src/core/index.js";

const assert = (name: string, condition: boolean) => {
	if (condition) {
		console.log(`[PASS] ${name}`);
	} else {
		console.log(`[FAIL] ${name}`);
	}
};

const assertEqual = <T>(name: string, actual: T, expected: T) => {
	if (actual === expected) {
		console.log(`[PASS] ${name}`);
	} else {
		console.log(`[FAIL] ${name}`);
		console.log(`  Expected: ${expected}`);
		console.log(`  Actual:   ${actual}`);
	}
};

console.log("--- Testing Lifecycle ---");

// 1. onMount collects callbacks
{
	const { mounts } = runWithLifecycle(() => {
		onMount(() => {});
		onMount(() => {});
	});
	assertEqual("onMount collects callbacks", mounts.length, 2);
}

// 2. onCleanup collects callbacks
{
	const { cleanups } = runWithLifecycle(() => {
		onCleanup(() => {});
		onCleanup(() => {});
		onCleanup(() => {});
	});
	assertEqual("onCleanup collects callbacks", cleanups.length, 3);
}

// 3. runWithLifecycle returns result
{
	const { result } = runWithLifecycle(() => "hello");
	assertEqual("runWithLifecycle returns result", result, "hello");
}

// 4. onMount does nothing outside runWithLifecycle
{
	let called = false;
	onMount(() => {
		called = true;
	});
	assert("onMount ignored outside context", !called);
}

// 5. onCleanup does nothing outside runWithLifecycle
{
	let called = false;
	onCleanup(() => {
		called = true;
	});
	assert("onCleanup ignored outside context", !called);
}

// 6. Nested runWithLifecycle isolates contexts
{
	const outer: (() => void)[] = [];
	const inner: (() => void)[] = [];

	const result = runWithLifecycle(() => {
		onMount(() => outer.push(() => {}));

		const innerResult = runWithLifecycle(() => {
			onMount(() => inner.push(() => {}));
			onMount(() => inner.push(() => {}));
		});

		onMount(() => outer.push(() => {}));

		return { outer, inner, innerResult };
	});

	assertEqual(
		"nested - inner has 2 mounts",
		result.result.innerResult.mounts.length,
		2,
	);
	assertEqual("nested - outer has 2 mounts", result.result.outer.length, 0);
}

// 7. Mount callbacks are not auto-executed
{
	let executed = false;
	const { mounts } = runWithLifecycle(() => {
		onMount(() => {
			executed = true;
		});
	});
	assert("mount not auto-executed", !executed);
	mounts[0]();
	assert("mount executed manually", executed);
}

// 8. Cleanup callbacks are not auto-executed
{
	let executed = false;
	const { cleanups } = runWithLifecycle(() => {
		onCleanup(() => {
			executed = true;
		});
	});
	assert("cleanup not auto-executed", !executed);
	cleanups[0]();
	assert("cleanup executed manually", executed);
}

// 9. cleanupMap stores cleanups per node
{
	const node = {} as Node;
	const fn1 = () => {};
	const fn2 = () => {};

	cleanupMap.set(node, [fn1, fn2]);
	assertEqual("cleanupMap stores array", cleanupMap.get(node)?.length, 2);
}

// 10. runWithLifecycle with async result (returns promise as-is)
{
	const { result } = runWithLifecycle(async () => "async");
	assert("async result is promise", result instanceof Promise);
}

// 11. Empty runWithLifecycle returns empty arrays
{
	const { mounts, cleanups } = runWithLifecycle(() => "no lifecycle");
	assertEqual("empty mounts", mounts.length, 0);
	assertEqual("empty cleanups", cleanups.length, 0);
}

// 12. Deeply nested contexts work correctly
{
	const outer = runWithLifecycle(() => {
		onMount(() => {});

		const inner = runWithLifecycle(() => {
			const deep = runWithLifecycle(() => {
				onMount(() => {});
				onMount(() => {});
			});
			return deep;
		});

		onMount(() => {});
		return inner;
	});

	assertEqual(
		"deeply nested - deep mounts",
		outer.result.result.mounts.length,
		2,
	);
	assertEqual("deeply nested - outer mounts", outer.mounts.length, 2);
}
