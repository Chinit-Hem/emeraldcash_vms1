"use client";

import {
  LiquidGlass,
  LiquidGlassCard,
  LiquidGlassNavbar,
  LiquidGlassPanel,
} from "@/app/components/ui/LiquidGlass";

/**
 * Liquid Glass Examples - Usage demonstrations for the frosted glass effect
 * 
 * These examples show how to apply the liquid glass effect to various UI components.
 * The effect ONLY applies in dark mode - light mode remains unchanged.
 */

// Example 1: Basic Card with Liquid Glass
export function ExampleBasicCard() {
  return (
    <LiquidGlassCard className="max-w-sm">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
        Liquid Glass Card
      </h3>
      <p className="text-slate-600 dark:text-slate-300">
        This card has a frosted glass effect in dark mode only. 
        In light mode, it uses the standard solid background.
      </p>
    </LiquidGlassCard>
  );
}

// Example 2: Custom Styled Card
export function ExampleCustomCard() {
  return (
    <LiquidGlass 
      className="p-6 rounded-2xl max-w-md"
      hover
      glow
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <span className="text-2xl">✨</span>
        </div>
        <div>
          <h4 className="font-semibold text-slate-800 dark:text-white">
            Premium Feature
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            With hover and glow effects
          </p>
        </div>
      </div>
    </LiquidGlass>
  );
}

// Example 3: Navigation Bar
export function ExampleNavbar() {
  return (
    <LiquidGlassNavbar>
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="font-bold text-slate-800 dark:text-white">
          My App
        </div>
        <nav className="flex gap-4">
          <a href="#" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400">
            Home
          </a>
          <a href="#" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400">
            About
          </a>
          <a href="#" className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400">
            Contact
          </a>
        </nav>
      </div>
    </LiquidGlassNavbar>
  );
}

// Example 4: Panel/Modal Container
export function ExamplePanel() {
  return (
    <LiquidGlassPanel className="max-w-lg">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
        Settings Panel
      </h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-slate-700 dark:text-slate-300">Dark Mode</span>
          <button className="w-12 h-6 rounded-full bg-emerald-500 relative">
            <span className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white" />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-700 dark:text-slate-300">Notifications</span>
          <button className="w-12 h-6 rounded-full bg-slate-300 dark:bg-slate-600 relative">
            <span className="absolute left-1 top-1 w-4 h-4 rounded-full bg-white" />
          </button>
        </div>
      </div>
    </LiquidGlassPanel>
  );
}

// Example 5: Using Utility Classes (Alternative approach)
export function ExampleUtilityClasses() {
  return (
    <div className="space-y-4">
      {/* Using the liquid-glass-card utility class */}
      <div className="liquid-glass-card max-w-sm">
        <h3 className="font-semibold text-slate-800 dark:text-white mb-2">
          Utility Class Card
        </h3>
        <p className="text-slate-600 dark:text-slate-300">
          This uses the .liquid-glass-card CSS utility class.
        </p>
      </div>

      {/* Using the liquid-glass-navbar utility class */}
      <div className="liquid-glass-navbar">
        <div className="flex items-center justify-between max-w-7xl mx-auto px-4">
          <span className="font-bold text-slate-800 dark:text-white">Navbar</span>
          <span className="text-slate-600 dark:text-slate-400">With utility class</span>
        </div>
      </div>
    </div>
  );
}

// Example 6: Direct Tailwind Classes (Most flexible)
export function ExampleDirectClasses() {
  return (
    <div className="
      /* Light mode - solid white background */
      bg-white
      /* Dark mode - liquid glass effect */
      dark:bg-slate-900/40
      dark:backdrop-blur-xl
      dark:border
      dark:border-white/10
      dark:shadow-2xl
      /* Common styles */
      p-6
      rounded-2xl
      max-w-sm
    ">
      <h3 className="font-semibold text-slate-800 dark:text-white mb-2">
        Direct Tailwind Classes
      </h3>
      <p className="text-slate-600 dark:text-slate-300">
        This example shows the exact Tailwind classes applied directly.
        Most flexible approach for custom styling.
      </p>
    </div>
  );
}

// Example 7: Grid of Cards (Dashboard-style)
export function ExampleDashboardGrid() {
  const cards = [
    { title: "Total Users", value: "12,345", change: "+12%" },
    { title: "Revenue", value: "$45,678", change: "+8%" },
    { title: "Orders", value: "1,234", change: "+23%" },
    { title: "Conversion", value: "3.45%", change: "-2%" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <LiquidGlassCard 
          key={index} 
          hover
          className="text-center"
        >
          <div className="text-3xl font-bold text-slate-800 dark:text-white mb-1">
            {card.value}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
            {card.title}
          </div>
          <div className={`text-xs font-medium ${
            card.change.startsWith('+') 
              ? 'text-emerald-600 dark:text-emerald-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {card.change}
          </div>
        </LiquidGlassCard>
      ))}
    </div>
  );
}

// Main showcase component
export default function LiquidGlassExamples() {
  return (
    <div className="p-8 space-y-8 bg-gray-100 dark:bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-8">
        Liquid Glass / Frosted Glass Examples
      </h1>
      
      <section>
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-4">
          1. Basic Card
        </h2>
        <ExampleBasicCard />
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-4">
          2. Custom Card with Hover & Glow
        </h2>
        <ExampleCustomCard />
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-4">
          3. Navigation Bar
        </h2>
        <ExampleNavbar />
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-4">
          4. Settings Panel
        </h2>
        <ExamplePanel />
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-4">
          5. Utility Classes Approach
        </h2>
        <ExampleUtilityClasses />
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-4">
          6. Direct Tailwind Classes
        </h2>
        <ExampleDirectClasses />
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-4">
          7. Dashboard Grid
        </h2>
        <ExampleDashboardGrid />
      </section>
    </div>
  );
}
