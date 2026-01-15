# 🎨 Simulation Engine UI Integration Guide

**Epic 28 - Complete UI Implementation**

This guide shows how to integrate the simulation preview components into your PayOS dashboard pages.

---

## 📦 Available Components

### 1. SimulationPreviewModal
Full-featured modal for displaying simulation results.

### 2. useSimulation Hook
React hook for managing simulation state and API calls.

### 3. TransferFormWithPreview
Example component showing complete integration.

### 4. Enhanced RefundModal
Refund modal with auto-simulation and inline preview.

---

## 🚀 Quick Start

### Basic Transfer Preview

```tsx
import { useState } from 'react';
import { SimulationPreviewModal } from '@/components/simulation-preview-modal';
import { useSimulation } from '@/hooks/use-simulation';
import { Button } from '@/components/ui/button';

function MyTransferPage() {
  const [showPreview, setShowPreview] = useState(false);
  const { simulate, execute, simulation, isSimulating, isExecuting } = useSimulation();

  const handlePreview = async () => {
    const result = await simulate({
      action: 'transfer',
      payload: {
        from_account_id: 'acc_123',
        to_account_id: 'acc_456',
        amount: '100.00',
        currency: 'USDC',
      },
    });

    if (result) {
      setShowPreview(true);
    }
  };

  const handleExecute = async () => {
    if (!simulation) return;
    
    const result = await execute(simulation.simulation_id);
    if (result) {
      // Success! Close modal and show success message
      setShowPreview(false);
      toast.success('Transfer executed successfully!');
    }
  };

  return (
    <>
      <Button onClick={handlePreview} disabled={isSimulating}>
        {isSimulating ? 'Simulating...' : 'Preview Transfer'}
      </Button>

      <SimulationPreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        simulation={simulation}
        onExecute={handleExecute}
        isExecuting={isExecuting}
      />
    </>
  );
}
```

---

## 🎯 Integration Patterns

### Pattern 1: Modal Preview (Transfers)

**Use Case:** User wants to preview before confirming

**Flow:**
1. User fills form
2. Clicks "Preview" button
3. Modal opens with simulation
4. User reviews and confirms
5. Execution happens
6. Modal closes with success
H
**Code:**
```tsx
// Add to your transfer form
<div className="flex gap-3">
  <Button variant="outline" onClick={handlePreview}>
    <Eye className="h-4 w-4 mr-2" />
    Preview Transfer
  </Button>
  <Button onClick={handleDirectSubmit}>
    <Send className="h-4 w-4 mr-2" />
    Send Now
  </Button>
</div>
```

### Pattern 2: Inline Preview (Refunds)

**Use Case:** Real-time validation as user types

**Flow:**
1. User opens refund modal
2. Enters amount
3. Auto-simulation runs (debounced)
4. Inline preview shows eligibility
5. Submit button enabled/disabled
6. User confirms

**Code:**
```tsx
// Auto-simulate on amount change
useEffect(() => {
  const timer = setTimeout(() => {
    if (isValidAmount) {
      simulateRefund();
    }
  }, 500); // 500ms debounce

  return () => clearTimeout(timer);
}, [amount]);
```

### Pattern 3: Batch Validation (Payroll)

**Use Case:** Validate many operations before processing

**Flow:**
1. User uploads CSV or enters multiple transfers
2. Clicks "Validate All"
3. Batch simulation runs
4. Summary shows success/failure counts
5. User reviews problematic rows
6. User confirms and executes all

**Code:**
```tsx
const handleBatchValidate = async () => {
  const result = await fetch('/api/simulate/batch', {
    method: 'POST',
    body: JSON.stringify({
      simulations: transfers.map(t => ({
        action: 'transfer',
        payload: t,
      })),
    }),
  });

  const data = await result.json();
  
  console.log(`✅ ${data.data.summary.successful} can execute`);
  console.log(`❌ ${data.data.summary.failed} will fail`);
};
```

---

## 🎨 UI Components Breakdown

### SimulationPreviewModal

**Props:**
```typescript
interface SimulationPreviewModalProps {
  open: boolean;                    // Modal visibility
  onClose: () => void;              // Close handler
  simulation: SimulationData | null; // Simulation data
  onExecute?: () => Promise<void>;  // Execute handler
  isExecuting?: boolean;            // Execution loading state
}
```

**Features:**
- ✅ Status badge (Ready/Cannot Execute)
- ✅ Error alerts (red, blocking)
- ✅ Warning alerts (yellow, non-blocking)
- ✅ Transfer flow visualization
- ✅ FX rate display (if cross-currency)
- ✅ Fee breakdown (platform, FX, rail)
- ✅ Timing estimate
- ✅ Balance impact
- ✅ Action buttons (Cancel, Execute)
- ✅ Loading states
- ✅ Dark mode support

**Sections:**

1. **Header**
   - Icon + "Transfer Preview" title
   - Close button

2. **Status Badge**
   - Green "Ready to Execute" or Red "Cannot Execute"

3. **Errors** (if any)
   - Red alert box
   - List of blocking errors

4. **Warnings** (if any)
   - Yellow alert box
   - List of non-blocking warnings

5. **Transfer Flow**
   - Source account (name, amount, balance before/after)
   - Arrow icon
   - Destination account (name, amount)

6. **FX Rate** (if cross-currency)
   - Exchange rate
   - Spread
   - Lock status

7. **Fee Breakdown**
   - Platform fee
   - FX fee
   - Rail fee
   - Total fees

8. **Timing**
   - Estimated duration
   - Payment rail

9. **Footer Actions**
   - Cancel button
   - Confirm & Execute button (if can_execute)

### useSimulation Hook

**API:**
```typescript
const {
  // Functions
  simulate: (payload: SimulationPayload) => Promise<SimulationData | null>,
  execute: (simulationId: string) => Promise<ExecuteResponse | null>,
  reset: () => void,

  // State
  simulation: SimulationData | null,
  isSimulating: boolean,
  isExecuting: boolean,
  error: string | null,
} = useSimulation();
```

**Usage:**
```tsx
// Simulate
const result = await simulate({
  action: 'transfer',
  payload: { /* ... */ },
});

// Execute
if (result?.can_execute) {
  const execution = await execute(result.simulation_id);
  console.log('Transfer ID:', execution.execution_result.id);
}

// Reset
reset(); // Clear simulation state
```

---

## 🎭 Visual States

### Loading State
```tsx
{isSimulating && (
  <div className="flex items-center gap-2">
    <Loader2 className="h-4 w-4 animate-spin" />
    <span>Simulating...</span>
  </div>
)}
```

### Success State (Can Execute)
```tsx
<Badge variant="default" className="bg-green-500">
  <CheckCircle2 className="h-3 w-3 mr-1" />
  Ready to Execute
</Badge>
```

### Error State (Cannot Execute)
```tsx
<Badge variant="destructive">
  <AlertCircle className="h-3 w-3 mr-1" />
  Cannot Execute
</Badge>

<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertDescription>
    {errors.map(e => <li>{e.message}</li>)}
  </AlertDescription>
</Alert>
```

### Warning State
```tsx
<Alert>
  <AlertTriangle className="h-4 w-4" />
  <AlertDescription>
    {warnings.map(w => <li>{w.message}</li>)}
  </AlertDescription>
</Alert>
```

---

## 🎨 Styling Guide

### Colors

**Status Colors:**
- Success: `bg-green-500`, `text-green-600`, `border-green-200`
- Error: `bg-red-500`, `text-red-600`, `border-red-200`
- Warning: `bg-yellow-50`, `text-yellow-600`, `border-yellow-200`
- Info: `bg-blue-50`, `text-blue-600`, `border-blue-200`

**Amount Colors:**
- Debit: `text-red-600` (negative, outgoing)
- Credit: `text-green-600` (positive, incoming)

### Typography

**Hierarchy:**
```tsx
// Modal title
<h2 className="text-lg font-semibold">

// Section headers
<div className="text-sm font-medium">

// Large amounts
<div className="text-2xl font-bold">

// Labels
<span className="text-sm text-muted-foreground">

// Details
<span className="text-xs text-muted-foreground">
```

### Spacing

```tsx
// Modal content
<div className="space-y-6">

// Form fields
<div className="space-y-4">

// List items
<ul className="space-y-2">

// Inline items
<div className="flex items-center gap-2">
```

---

## 🔧 Customization

### Custom Preview Display

```tsx
// Create your own preview component
function CustomPreview({ simulation }) {
  const { preview, warnings, errors } = simulation;

  return (
    <div className="custom-preview">
      {/* Your custom layout */}
      <h3>Transfer Summary</h3>
      <p>Amount: {preview.source.amount}</p>
      <p>Fees: {preview.fees.total}</p>
      
      {/* Use existing sub-components */}
      {warnings.length > 0 && <WarningsList warnings={warnings} />}
      {errors.length > 0 && <ErrorsList errors={errors} />}
    </div>
  );
}
```

### Custom Simulation Logic

```tsx
// Extend the hook for custom behavior
function useCustomSimulation() {
  const base = useSimulation();
  
  const simulateWithAnalytics = async (payload) => {
    // Track analytics
    analytics.track('simulation_started', payload);
    
    // Run simulation
    const result = await base.simulate(payload);
    
    // Track result
    analytics.track('simulation_completed', {
      can_execute: result?.can_execute,
    });
    
    return result;
  };

  return {
    ...base,
    simulate: simulateWithAnalytics,
  };
}
```

---

## 📱 Responsive Design

### Mobile Considerations

```tsx
<DialogContent className="
  max-w-2xl           // Desktop: 672px max width
  max-h-[90vh]        // Never exceed 90% viewport height
  overflow-y-auto     // Scroll if content too long
  mx-4                // Mobile: 16px horizontal margin
">
```

### Breakpoints

```tsx
// Stack on mobile, side-by-side on desktop
<div className="
  flex 
  flex-col          // Mobile: stack vertically
  md:flex-row       // Desktop: side by side
  gap-4
">
```

---

## 🧪 Testing Integration

### Manual Testing Checklist

```markdown
## Transfer Preview
- [ ] Preview button appears
- [ ] Modal opens on click
- [ ] All data displays correctly
- [ ] FX rate shows (if cross-currency)
- [ ] Fees breakdown correct
- [ ] Warnings appear (if any)
- [ ] Errors appear (if any)
- [ ] Execute button works
- [ ] Cancel closes modal
- [ ] Loading states work

## Refund Preview
- [ ] Auto-simulation triggers
- [ ] Debounce works (500ms)
- [ ] Eligibility shows
- [ ] Balance impact displays
- [ ] Submit disabled if ineligible
- [ ] Warnings show inline
- [ ] Errors show inline

## Error Handling
- [ ] Network error shows message
- [ ] Invalid payload shows error
- [ ] Expired simulation handled
- [ ] Variance threshold handled
```

### Automated Testing

```typescript
// Example test
describe('SimulationPreviewModal', () => {
  it('displays transfer preview correctly', async () => {
    const simulation = {
      can_execute: true,
      preview: {
        source: { amount: '100.00', currency: 'USDC' },
        destination: { amount: '100.00', currency: 'USDC' },
        fees: { total: '0.50', currency: 'USDC' },
      },
      warnings: [],
      errors: [],
    };

    render(
      <SimulationPreviewModal
        open={true}
        onClose={jest.fn()}
        simulation={simulation}
      />
    );

    expect(screen.getByText('Ready to Execute')).toBeInTheDocument();
    expect(screen.getByText('100.00')).toBeInTheDocument();
  });
});
```

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] All components tested in isolation
- [ ] Integration tested in real forms
- [ ] Error states handled gracefully
- [ ] Loading states visible
- [ ] Dark mode works correctly
- [ ] Mobile responsive
- [ ] API routes configured
- [ ] Environment variables set
- [ ] Analytics tracking added (optional)
- [ ] Performance tested (< 1s simulations)

---

## 📚 Additional Resources

- [Simulation Engine Demo Guide](./SIMULATION_ENGINE_DEMO.md)
- [Story 28.8 Complete Documentation](../completed/stories/STORY_28.8_COMPLETE.md)
- [Epic 28 Overview](../prd/epics/epic-28-simulation.md)

---

## 💡 Tips & Best Practices

### 1. Always Handle Errors
```tsx
const result = await simulate(payload);
if (!result) {
  // Show error toast
  toast.error(error || 'Simulation failed');
  return;
}
```

### 2. Debounce Auto-Simulations
```tsx
// Prevent excessive API calls
useEffect(() => {
  const timer = setTimeout(() => {
    simulateRefund();
  }, 500);
  return () => clearTimeout(timer);
}, [amount]);
```

### 3. Reset State on Close
```tsx
const handleClose = () => {
  setShowPreview(false);
  reset(); // Clear simulation state
};
```

### 4. Show Loading States
```tsx
<Button disabled={isSimulating || isExecuting}>
  {isSimulating ? 'Simulating...' : 'Preview'}
</Button>
```

### 5. Validate Before Simulating
```tsx
if (!isValidAmount || !fromAccount || !toAccount) {
  return; // Don't simulate invalid data
}
```

---

## 🎉 You're Ready!

You now have everything you need to integrate simulation previews into your PayOS dashboard. The components are production-ready and fully tested.

**Happy Building! 🚀**



