import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

type NativeSelectProps = React.ComponentProps<'select'> & {
  containerClassName?: string;
};

const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, containerClassName, children, ...props }, ref) => (
    <span className={cn('relative inline-flex max-w-full', containerClassName)}>
      <select
        ref={ref}
        className={cn(
          'h-11 min-h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-9 text-sm text-slate-950 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
      />
    </span>
  )
);
NativeSelect.displayName = 'NativeSelect';

const NativeSelectOption = React.forwardRef<HTMLOptionElement, React.ComponentProps<'option'>>(
  ({ className, ...props }, ref) => <option ref={ref} className={className} {...props} />
);
NativeSelectOption.displayName = 'NativeSelectOption';

const NativeSelectOptGroup = React.forwardRef<HTMLOptGroupElement, React.ComponentProps<'optgroup'>>(
  ({ className, ...props }, ref) => <optgroup ref={ref} className={className} {...props} />
);
NativeSelectOptGroup.displayName = 'NativeSelectOptGroup';

export { NativeSelect, NativeSelectOption, NativeSelectOptGroup };
