import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Check, ChevronsUpDown, Search } from 'lucide-react';

// Lista de íconos comúnmente usados en menús de aplicaciones
export const COMMON_MENU_ICONS = [
  'LayoutDashboard',
  'Shield',
  'Wrench',
  'Settings',
  'Building2',
  'Users',
  'Fingerprint',
  'FileText',
  'CreditCard',
  'Calendar',
  'Clock',
  'Monitor',
  'Menu',
  'Grid',
  'ListTree',
  'Database',
  'Server',
  'Activity',
  'BarChart',
  'TrendingUp',
  'Package',
  'ShoppingCart',
  'Wallet',
  'Tag',
  'Bookmark',
  'Star',
  'Heart',
  'Bell',
  'Mail',
  'MessageSquare',
  'Phone',
  'Video',
  'Image',
  'File',
  'Folder',
  'Download',
  'Upload',
  'Share',
  'Link',
  'Copy',
  'Clipboard',
  'Edit',
  'Trash2',
  'Plus',
  'Minus',
  'X',
  'Check',
  'AlertTriangle',
  'AlertCircle',
  'Info',
  'HelpCircle',
  'MapPin',
  'Globe',
  'Home',
  'Building',
  'Store',
  'Briefcase',
  'GraduationCap',
  'Award',
  'Target',
  'Zap',
  'Rocket',
  'Cpu',
  'HardDrive',
  'Lock',
  'Unlock',
  'Eye',
  'EyeOff',
  'User',
  'UserPlus',
  'UserCheck',
  'UserX',
  'UsersRound',
  'UserCircle',
  'Key',
  'ShieldCheck',
  'ShieldAlert',
  'CircleDot',
  'Square',
  'Circle',
  'Triangle',
  'Layers',
  'Network',
  'GitBranch',
  'Code',
  'Terminal',
  'Boxes',
  'Archive',
  'Inbox',
  'Send',
  'MousePointerClick',
  'Repeat',
  'RefreshCw',
  'RotateCw',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'ChevronLeft',
  'ChevronRight',
  'ChevronUp',
  'ChevronDown',
  'SlidersHorizontal',
  'Sliders',
  'Filter',
  'Search',
  'Maximize',
  'Minimize',
  'Percent',
  'DollarSign',
  'BadgeCheck',
  'Landmark',
  'WalletCards',
  'Receipt',
  'Calculator',
  'CalendarClock',
  'CalendarX',
  'Timer',
  'Play',
  'Pause',
  'StopCircle',
  'SkipForward',
  'SkipBack',
  'ArrowLeftRight',
  'ListChecks',
  'CheckCircle2',
  'XCircle',
  'MessageSquareQuote',
  'IdCard',
  'ClipboardList',
  'Table2',
  'FileSearch',
  'LockKeyhole',
  'KeyRound',
  'BellRing',
];

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  label?: string;
  description?: string;
}

// Componente helper para renderizar un ícono dinámicamente
export const DynamicIcon = ({ name, className = "w-5 h-5" }: { name: string; className?: string }) => {
  const IconComponent = (Icons as any)[name];
  
  if (!IconComponent) {
    return <Icons.CircleDot className={className} />;
  }
  
  return <IconComponent className={className} />;
};

export function IconPicker({ value, onChange, label = "Icono", description }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIcons = COMMON_MENU_ICONS.filter(icon =>
    icon.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <DynamicIcon name={value} className="w-4 h-4" />
              <span className="font-mono text-sm">{value}</span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Input
                placeholder="Buscar ícono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 focus-visible:ring-0 h-11"
              />
            </div>
            <CommandList className="max-h-[300px] overflow-y-auto">
              <CommandEmpty>No se encontraron íconos.</CommandEmpty>
              <CommandGroup>
                <div className="grid grid-cols-5 gap-1 p-2">
                  {filteredIcons.map((iconName) => (
                    <button
                      key={iconName}
                      onClick={() => {
                        onChange(iconName);
                        setOpen(false);
                      }}
                      className={`
                        flex flex-col items-center justify-center gap-1 p-3 rounded-lg
                        hover:bg-accent transition-colors
                        ${value === iconName ? 'bg-primary/10 border-2 border-primary' : 'border-2 border-transparent'}
                      `}
                      title={iconName}
                    >
                      <DynamicIcon name={iconName} className="w-5 h-5" />
                      <span className="text-[9px] text-muted-foreground text-center leading-tight max-w-full truncate">
                        {iconName}
                      </span>
                    </button>
                  ))}
                </div>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
