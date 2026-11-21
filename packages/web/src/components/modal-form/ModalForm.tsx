import cn from 'classnames'
import { Form, FormikFormProps } from 'formik'

import styles from './ModalForm.module.css'

export const ModalForm = ({
  className,
  children,
  ...formProps
}: FormikFormProps) => {
  return (
    <Form {...formProps} className={cn(styles.root, className)}>
      {children}
    </Form>
  )
}
