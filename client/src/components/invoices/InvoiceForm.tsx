import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useForm, useFieldArray } from 'react-hook-form';
import { format } from 'date-fns';
import { Invoice, InvoiceItem } from '../../services/invoiceService';

interface InvoiceFormProps {
  initialData?: Invoice;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting: boolean;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ initialData, onSubmit, isSubmitting }) => {
  const router = useRouter();
  const isEditMode = !!initialData;
  
  // Convert date strings to YYYY-MM-DD format for input[type="date"]
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return format(date, 'yyyy-MM-dd');
  };
  
  // Form setup with react-hook-form
  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: initialData 
      ? {
          ...initialData,
          dueDate: formatDateForInput(initialData.dueDate),
          items: initialData.items || [],
        }
      : {
          invoiceNumber: `INV-${Math.floor(10000 + Math.random() * 90000)}`,
          clientId: '',
          clientName: '',
          clientEmail: '',
          items: [{ description: '', quantity: 1, price: 0 }],
          subtotal: 0,
          tax: 0,
          total: 0,
          status: 'unpaid',
          dueDate: formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()), // 30 days from now
        }
  });
  
  // Use field array to handle dynamic invoice items
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });
  
  // Watch items to calculate totals
  const items = watch('items');
  
  // Calculate totals when items change
  useEffect(() => {
    if (items) {
      const subtotal = items.reduce(
        (sum, item) => sum + (Number(item.quantity) * Number(item.price) || 0),
        0
      );
      const tax = subtotal * 0.1; // Assuming 10% tax rate
      const total = subtotal + tax;
      
      setValue('subtotal', subtotal);
      setValue('tax', tax);
      setValue('total', total);
    }
  }, [items, setValue]);
  
  const handleAddItem = () => {
    append({ description: '', quantity: 1, price: 0 });
  };
  
  const handleFormSubmit = async (data: any) => {
    await onSubmit(data);
  };
  
  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Invoice Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Invoice Details</h3>
          
          <div>
            <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Invoice Number
            </label>
            <input
              id="invoiceNumber"
              type="text"
              className="form-input"
              {...register('invoiceNumber', { required: 'Invoice number is required' })}
              readOnly={isEditMode} // Don't allow editing invoice number if editing
            />
            {errors.invoiceNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.invoiceNumber.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              className="form-input"
              {...register('status', { required: 'Status is required' })}
            >
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
            {errors.status && (
              <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              id="dueDate"
              type="date"
              className="form-input"
              {...register('dueDate', { required: 'Due date is required' })}
            />
            {errors.dueDate && (
              <p className="mt-1 text-sm text-red-600">{errors.dueDate.message}</p>
            )}
          </div>
        </div>
        
        {/* Client Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Client Details</h3>
          
          <div>
            <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1">
              Client Name
            </label>
            <input
              id="clientName"
              type="text"
              className="form-input"
              {...register('clientName', { required: 'Client name is required' })}
            />
            {errors.clientName && (
              <p className="mt-1 text-sm text-red-600">{errors.clientName.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Client Email
            </label>
            <input
              id="clientEmail"
              type="email"
              className="form-input"
              {...register('clientEmail', { 
                required: 'Client email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
            />
            {errors.clientEmail && (
              <p className="mt-1 text-sm text-red-600">{errors.clientEmail.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-1">
              Client ID (Optional)
            </label>
            <input
              id="clientId"
              type="text"
              className="form-input"
              {...register('clientId')}
            />
          </div>
        </div>
      </div>
      
      {/* Invoice Items */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Invoice Items</h3>
          <button
            type="button"
            onClick={handleAddItem}
            className="btn-secondary text-sm py-1"
          >
            Add Item
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Description</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 w-24">Quantity</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 w-32">Price ($)</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 w-32">Amount ($)</th>
                <th className="px-4 py-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                const quantity = watch(`items.${index}.quantity`) || 0;
                const price = watch(`items.${index}.price`) || 0;
                const amount = Number(quantity) * Number(price);
                
                return (
                  <tr key={field.id} className="border-t border-gray-200">
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        className="form-input"
                        {...register(`items.${index}.description` as const, {
                          required: 'Description is required'
                        })}
                      />
                      {errors.items?.[index]?.description && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.items[index]?.description?.message}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        {...register(`items.${index}.quantity` as const, {
                          required: 'Required',
                          min: { value: 1, message: 'Min 1' },
                          valueAsNumber: true
                        })}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-input"
                        {...register(`items.${index}.price` as const, {
                          required: 'Required',
                          min: { value: 0, message: 'Min 0' },
                          valueAsNumber: true
                        })}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      ${amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Invoice Totals */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">${watch('subtotal').toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax (10%):</span>
              <span className="font-medium">${watch('tax').toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="font-bold">Total:</span>
              <span className="font-bold">${watch('total').toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Form Actions */}
      <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center">
              <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
              {isEditMode ? 'Updating...' : 'Creating...'}
            </span>
          ) : (
            isEditMode ? 'Update Invoice' : 'Create Invoice'
          )}
        </button>
      </div>
    </form>
  );
};

export default InvoiceForm;
