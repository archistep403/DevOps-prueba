// Campo de formulario con etiqueta, ayuda y mensaje de error (usa las clases del CSS original).
export default function Field({ form, name, label, type = 'text', hint, full, as, children, ...rest }) {
  const Tag = as || 'input';
  return (
    <div className={`form-field${full ? ' full' : ''}`}>
      <label htmlFor={name}>{label}</label>
      <Tag
        id={name}
        name={name}
        type={Tag === 'input' ? type : undefined}
        value={form.values[name]}
        onChange={form.handleChange}
        onBlur={form.handleBlur}
        className={form.stateClass(name)}
        {...rest}
      >
        {children}
      </Tag>
      {hint && <small className="field-hint">{hint}</small>}
      <small className="field-error">{form.errors[name]}</small>
    </div>
  );
}
