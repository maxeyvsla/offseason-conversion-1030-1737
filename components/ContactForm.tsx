'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  certificateCode: z.string()
    .length(8, 'Certificate code must be exactly 8 characters')
    .toUpperCase(),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

interface ContactFormProps {
  isOpen: boolean;
  onClose: () => void;
  certificateCode: string;
  email: string;
}

export default function ContactForm({ isOpen, onClose, certificateCode, email }: ContactFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: email,
      certificateCode: certificateCode,
      message: '',
    },
  });

  useEffect(() => {
    form.setValue('email', email);
    form.setValue('certificateCode', certificateCode);
  }, [form, email, certificateCode]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(false);
    setIsSubmitted(true);
  };

  const handleClose = () => {
    // First close the dialog
    onClose();
    
    // Then reset the form state after a delay
    setTimeout(() => {
      form.reset();
      setIsSubmitted(false);
    }, 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="rounded-lg sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>{isSubmitted ? 'Message Sent' : 'Contact Support'}</DialogTitle>
          <DialogDescription>
            {isSubmitted
              ? 'Thank you for reaching out. We\'ll get back to you soon.'
              : 'Having trouble? Let us know and we\'ll help you out.'}
          </DialogDescription>
        </DialogHeader>
        {!isSubmitted ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Your email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="certificateCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Certificate Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your certificate code"
                        {...field} 
                        value={field.value.toUpperCase()}
                        maxLength={8}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the issue you're experiencing"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Message'
                )}
              </Button>
            </form>
          </Form>
        ) : (
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <Button onClick={handleClose} className="mt-4">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}