import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '../../lib/utils';
import { DialogOverlay } from './dialog';

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

type SheetContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  side?: 'top' | 'bottom' | 'left' | 'right';
  onOverlayClick?: React.MouseEventHandler<HTMLDivElement>;
};

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ side = 'bottom', className, children, onOverlayClick, ...props }, ref) => {
  const sideStyles = {
    top: 'inset-x-0 top-0 rounded-b-2xl border-b',
    bottom: 'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-2xl border-t',
    left: 'inset-y-0 left-0 h-full w-[min(84vw,22rem)] rounded-r-2xl border-r',
    right: 'inset-y-0 right-0 h-full w-[min(84vw,22rem)] rounded-l-2xl border-l',
  };

  return (
    <DialogPrimitive.Portal>
      <DialogOverlay onClick={onOverlayClick} />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed z-50 flex flex-col gap-4 border-slate-200 bg-white p-5 text-slate-950 shadow-xl outline-none',
          sideStyles[side],
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});
SheetContent.displayName = 'SheetContent';

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1.5', className)} {...props} />
);

const SheetTitle = DialogPrimitive.Title;
const SheetDescription = DialogPrimitive.Description;

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription };
