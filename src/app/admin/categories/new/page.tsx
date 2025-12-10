

'use client';

import CategoryForm from '@/components/admin/CategoryForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function NewCategoryPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Category</CardTitle>
        <CardDescription>
            Create a new category to organize your videos. It will be saved as a draft.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CategoryForm />
      </CardContent>
    </Card>
  )
}
