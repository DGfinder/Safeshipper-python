#!/bin/bash

# Update all @/lib/utils imports to @/shared/lib/utils
find src -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" | while read file; do
  if grep -q "from ['\"]@/lib/utils['\"]" "$file"; then
    echo "Updating: $file"
    sed -i "s|from ['\"]@/lib/utils['\"]|from '@/shared/lib/utils'|g" "$file"
  fi
done

echo "All @/lib/utils imports have been updated!"