<script lang="ts">
	/** Full-bleed animated background for the login page. Uses reduced motion when preferred. */
</script>

<div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
	<svg
		class="absolute inset-0 w-full h-full"
		viewBox="0 0 1200 800"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		preserveAspectRatio="xMidYMid slice"
		style="overflow: hidden;"
	>
		<defs>
			<linearGradient id="wave-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="#C9A8D9" stop-opacity="0.45" />
				<stop offset="100%" stop-color="#B784C7" stop-opacity="0.3" />
			</linearGradient>
			<linearGradient id="wave-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stop-color="#D4B8E0" stop-opacity="0.35" />
				<stop offset="100%" stop-color="#C9A8D9" stop-opacity="0.2" />
			</linearGradient>
			<filter id="wave-blur" x="-20%" y="-20%" width="140%" height="140%">
				<feGaussianBlur in="SourceGraphic" stdDeviation="24" result="blur" />
				<feMerge>
					<feMergeNode in="blur" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>
		</defs>
		<!-- Wave 1 -->
		<path
			id="wave1"
			d="M0 400 Q300 320 600 400 T1200 400 V800 H0 Z"
			fill="url(#wave-grad-1)"
			class="login-wave login-wave-1"
		/>
		<!-- Wave 2 (path kept within viewBox to avoid overflow on mobile) -->
		<path
			id="wave2"
			d="M0 450 Q400 350 800 450 T1200 450 V800 H0 Z"
			fill="url(#wave-grad-2)"
			class="login-wave login-wave-2"
		/>
	</svg>
</div>

<style>
	@media (prefers-reduced-motion: no-preference) {
		.login-wave {
			transform-origin: center center;
			animation-duration: 12s;
			animation-timing-function: ease-in-out;
			animation-iteration-count: infinite;
		}
		.login-wave-1 {
			animation-name: wave-drift-1;
		}
		.login-wave-2 {
			animation-name: wave-drift-2;
		}
	}
	@keyframes wave-drift-1 {
		0%,
		100% {
			transform: translateX(0) translateY(0) scale(1);
		}
		50% {
			transform: translateX(-3%) translateY(-2%) scale(1.02);
		}
	}
	@keyframes wave-drift-2 {
		0%,
		100% {
			transform: translateX(0) translateY(0) scale(1);
		}
		50% {
			transform: translateX(2%) translateY(1.5%) scale(1.01);
		}
	}
</style>
