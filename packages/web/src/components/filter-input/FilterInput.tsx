import { Input } from 'components/input'

import styles from './FilterInput.module.css'

type FilterInputProps = {
  placeholder: string
  onChange: (e: any) => void
  value: string
}

// Input component used for filtering content,
// e.g. filtering tracks on the favorites page.
const FilterInput = ({ placeholder, onChange, value }: FilterInputProps) => {
  return (
    <div className={styles.filterContainer}>
      <Input
        className={styles.filterInput}
        placeholder={placeholder}
        onChange={onChange}
        value={value}
        variant='bordered'
      />
    </div>
  )
}

export default FilterInput
