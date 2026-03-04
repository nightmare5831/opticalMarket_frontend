interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  color?: 'blue' | 'white' | 'gray';
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-b-2',
  lg: 'h-12 w-12 border-b-2',
};

const colorClasses = {
  blue: 'border-blue-600',
  white: 'border-white',
  gray: 'border-gray-400',
};

export default function LoadingSpinner({ size = 'lg', message, color = 'blue' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center">
      <div className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]}`}></div>
      {message && <p className={`mt-4 ${color === 'white' ? 'text-white font-medium' : 'text-gray-500'}`}>{message}</p>}
    </div>
  );
}
