import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface FormSectionProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  icon,
  children
}) => {
  return (
    <Card className="border-2">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          {icon}
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="text-sm mt-1">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {children}
      </CardContent>
    </Card>
  );
};
