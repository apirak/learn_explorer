import '@adonisjs/inertia/types'

import type React from 'react'
import type { Prettify } from '@adonisjs/core/types/common'

type ExtractProps<T> =
  T extends React.FC<infer Props>
    ? Prettify<Omit<Props, 'children'>>
    : T extends React.Component<infer Props>
      ? Prettify<Omit<Props, 'children'>>
      : never

declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    'account': ExtractProps<(typeof import('../../inertia/pages/account.tsx'))['default']>
    'admin/dashboard': ExtractProps<(typeof import('../../inertia/pages/admin/dashboard.tsx'))['default']>
    'admin/retention': ExtractProps<(typeof import('../../inertia/pages/admin/retention.tsx'))['default']>
    'admin/students/index': ExtractProps<(typeof import('../../inertia/pages/admin/students/index.tsx'))['default']>
    'admin/students/show': ExtractProps<(typeof import('../../inertia/pages/admin/students/show.tsx'))['default']>
    'admin/users': ExtractProps<(typeof import('../../inertia/pages/admin/users.tsx'))['default']>
    'auth/login': ExtractProps<(typeof import('../../inertia/pages/auth/login.tsx'))['default']>
    'auth/signup': ExtractProps<(typeof import('../../inertia/pages/auth/signup.tsx'))['default']>
    'errors/forbidden': ExtractProps<(typeof import('../../inertia/pages/errors/forbidden.tsx'))['default']>
    'errors/not_found': ExtractProps<(typeof import('../../inertia/pages/errors/not_found.tsx'))['default']>
    'errors/server_error': ExtractProps<(typeof import('../../inertia/pages/errors/server_error.tsx'))['default']>
    'student/career': ExtractProps<(typeof import('../../inertia/pages/student/career.tsx'))['default']>
    'student/careers': ExtractProps<(typeof import('../../inertia/pages/student/careers.tsx'))['default']>
    'student/home': ExtractProps<(typeof import('../../inertia/pages/student/home.tsx'))['default']>
    'student/mypath': ExtractProps<(typeof import('../../inertia/pages/student/mypath.tsx'))['default']>
    'student/print': ExtractProps<(typeof import('../../inertia/pages/student/print.tsx'))['default']>
    'student/result': ExtractProps<(typeof import('../../inertia/pages/student/result.tsx'))['default']>
    'student/test': ExtractProps<(typeof import('../../inertia/pages/student/test.tsx'))['default']>
  }
}
