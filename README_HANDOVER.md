# Project Handover: Fleet Intelligence Control Tower

This document provides a comprehensive overview of the Fleet Intelligence Dashboard Suite designed for Philippines logistics operations.

## 1. Project Overview
An enterprise-grade operational control tower with 5 interconnected dashboards. The platform transitions from generic BI reporting to predictive operational intelligence.

## 2. File Structure
- `index.html`: Main SPA shell. Contains the dashboard containers, investigation drawer, alert feed, and modals.
- `style.css`: Enhanced design system. Handles sidebar collapse, high-density grids, heatmaps, and transitions.
- `data.js`: **Critical Master Data**. Governs 30 trucks with consistent attributes (Region, Driver, Runtime, Fuel, Compliance, IoT).
- `app.js`: Core logic. Handles reactive filtering, Chart.js initialization, custom visualizations, and interactive workflows (IoT restart).

## 3. Design System & UX
- **Theme**: Enterprise Semi-Dark (#0f172a sidebar, #f8fafc content).
- **Primary Accent**: FarEye Red (#ef4444).
- **Navigation**: Collapsible sidebar (260px -> 64px) to maximize workspace.
- **Density**: Optimized for operational command centers; reduced chart heights (200-250px) to maximize vertically visible data.

## 4. Key Operational Features
- **Global Filter Bar**: Sticky bar allowing real-time filtering by Region, Fleet Type, and Status across all 5 dashboards.
- **Fleet Risk Bands**: Horizontal visualization of runtime exposure (Healthy -> Monitor -> Warning -> Critical -> Breached).
- **Investigation Drawer**: Slide-in panel (420px) for deep-dive asset investigation without losing dashboard context.
- **IoT Restart Workflow**: Simulated technical workflow with confirmation modals, a 5-minute countdown timer, and live progress steps.
- **Live Alert Feed**: Real-time operational event stream with severity color-coding.

## 5. Implementation Notes for Future Agents
- **Data Consistency**: Ensure all new features reference `FLEET_MASTER_DATA`. Do not use disconnected dummy data.
- **Reactive Updates**: The `applyFilters()` function in `app.js` is the central hub for re-rendering views when global filters change.
- **Scalability**: Dashboard views are modular. New modules should follow the `view-container` class and `data-view` attribute pattern.
