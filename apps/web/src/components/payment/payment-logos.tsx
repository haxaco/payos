'use client';

export function VisaLogo({ className = 'h-4 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 16" className={className}>
      <path
        fill="#1434CB"
        d="M17.88 1.42L14.56 14.5h-3.12L14.76 1.42h3.12zM30.48 9.86l1.64-4.5.94 4.5h-2.58zm3.48 4.64h2.88L34.4 1.42h-2.66c-.6 0-1.1.35-1.32.88l-4.66 12.2h3.26l.65-1.78h3.98l.37 1.78zM25.44 10.12c.02-3.44-4.76-3.64-4.72-5.18.02-.46.46-.96 1.44-1.08.48-.06 1.82-.1 3.34.54l.6-2.78C25.02 1.24 23.64 1 21.98 1c-3.08 0-5.24 1.64-5.26 3.98-.02 1.74 1.54 2.7 2.72 3.28 1.22.58 1.62.96 1.62 1.48-.02.8-.98 1.16-1.88 1.18-1.58.02-2.5-.42-3.22-.76l-.58 2.68c.74.34 2.1.64 3.5.66 3.28 0 5.42-1.62 5.44-4.12l.12-.26zM11.36 1.42L6.1 14.5H2.78L.14 3.9c-.16-.62-.3-.84-.78-1.1-.78-.42-2.08-.82-3.22-1.06l.08-.32h5.28c.68 0 1.28.44 1.44 1.22l1.3 6.92 3.22-8.14h3.26z"
      />
    </svg>
  );
}

export function MastercardLogo({ className = 'h-5 w-auto', showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <svg viewBox="0 0 48 30" className={className}>
        <circle cx="17" cy="15" r="15" fill="#EB001B" />
        <circle cx="31" cy="15" r="15" fill="#F79E1B" />
        <path
          d="M24 5.02c2.8 2.2 4.6 5.6 4.6 9.48s-1.8 7.28-4.6 9.48a12.54 12.54 0 01-4.6-9.48c0-3.88 1.8-7.28 4.6-9.48z"
          fill="#FF5F00"
        />
      </svg>
      {showText && <span className="text-sm font-medium text-foreground">Mastercard</span>}
    </span>
  );
}

export function StripeLogo({ className }: { className?: string }) {
  return (
    <span className={`text-sm font-bold tracking-tight ${className || ''}`} style={{ color: '#635BFF' }}>
      Stripe
    </span>
  );
}

export function GooglePayLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 24" className={className}>
      <path d="M26.83 11.73V17h-1.42V5h3.77c.96 0 1.77.32 2.43.95.68.63 1.01 1.4 1.01 2.3 0 .92-.34 1.69-1.01 2.32-.66.63-1.47.94-2.43.94h-2.35zm0-5.32v3.91h2.38c.56 0 1.04-.2 1.42-.6.38-.4.58-.88.58-1.35 0-.47-.2-.95-.57-1.36-.38-.4-.85-.6-1.43-.6h-2.38z" fill="#3C4043"/>
      <path d="M35.33 8.89c1.05 0 1.87.28 2.48.84.61.56.91 1.33.91 2.31V17h-1.36v-1.09h-.06c-.59.89-1.37 1.34-2.33 1.34-.82 0-1.51-.24-2.06-.72-.56-.48-.83-1.08-.83-1.81 0-.77.3-1.38.88-1.83.59-.46 1.37-.68 2.35-.68.84 0 1.53.15 2.07.46v-.32c0-.53-.21-.98-.62-1.34-.41-.36-.89-.54-1.43-.54-.83 0-1.49.35-1.97 1.06l-1.25-.79c.72-1.05 1.78-1.57 3.22-1.85zm-1.82 5.57c0 .4.17.73.52.99.35.27.75.4 1.21.4.65 0 1.23-.25 1.72-.74.5-.49.75-1.07.75-1.73-.44-.35-1.06-.53-1.85-.53-.58 0-1.06.14-1.46.42-.4.28-.59.64-.89 1.19z" fill="#3C4043"/>
      <path d="M44.61 9.14l-4.73 10.88h-1.46l1.76-3.82-3.11-7.06h1.55l2.22 5.37h.03l2.16-5.37h1.58z" fill="#3C4043"/>
      <path d="M20.44 11.23c0-.46-.04-.9-.12-1.32h-7.89v2.49h4.51c-.19 1.04-.79 1.93-1.68 2.52v2.08h2.72c1.59-1.46 2.46-3.62 2.46-5.77z" fill="#4285F4"/>
      <path d="M12.43 17.32c2.27 0 4.17-.75 5.56-2.04l-2.72-2.08c-.75.5-1.71.8-2.84.8-2.18 0-4.03-1.47-4.69-3.46H4.9v2.15c1.38 2.73 4.22 4.63 7.53 4.63z" fill="#34A853"/>
      <path d="M7.74 12.54c-.17-.5-.27-1.04-.27-1.6 0-.56.1-1.09.27-1.59V7.21H4.9a9.04 9.04 0 000 7.48l2.84-2.15z" fill="#FBBC05"/>
      <path d="M12.43 6.42c1.23 0 2.34.42 3.21 1.25l2.41-2.4C16.58 3.89 14.68 3.05 12.43 3.05c-3.31 0-6.15 1.9-7.53 4.63l2.84 2.15c.66-1.99 2.51-3.41 4.69-3.41z" fill="#EA4335"/>
    </svg>
  );
}

interface PaymentHandlerDisplayProps {
  handler?: string;
  network?: string;
  paymentType?: string;
  className?: string;
}

const handlerLabels: Record<string, string> = {
  stripe: 'Stripe',
  google_pay: 'Google Pay',
  visa_agentpay: 'Visa AgentPay',
  payos: 'Sly Native',
};

const networkLabels: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
};

const typeLabels: Record<string, string> = {
  card: 'Card',
  corporate_card: 'Corporate Card',
  digital_wallet: 'Digital Wallet',
  wallet: 'Wallet',
  corporate_wallet: 'Corporate Wallet',
};

export function PaymentHandlerDisplay({ handler, network, paymentType, className }: PaymentHandlerDisplayProps) {
  if (!handler && !network && !paymentType) {
    return <div className={`capitalize ${className || ''}`}>Unknown</div>;
  }

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className || ''}`}>
      {handler === 'stripe' && <StripeLogo />}
      {handler === 'google_pay' && <GooglePayLogo />}
      {handler === 'visa_agentpay' && <VisaLogo />}

      {handler && !['stripe', 'google_pay', 'visa_agentpay'].includes(handler) && (
        <span className="text-sm font-medium">{handlerLabels[handler] || handler}</span>
      )}

      {network && (
        <span className="flex items-center gap-1 text-muted-foreground">
          <span className="text-xs">via</span>
          {network === 'visa' && <VisaLogo className="h-3 w-auto" />}
          {network === 'mastercard' && <MastercardLogo className="h-3.5 w-auto" showText={true} />}
          {!['visa', 'mastercard'].includes(network) && (
            <span className="text-xs">{networkLabels[network] || network}</span>
          )}
        </span>
      )}

      {paymentType && !handler && (
        <span className="text-sm capitalize">{typeLabels[paymentType] || paymentType}</span>
      )}
    </div>
  );
}
