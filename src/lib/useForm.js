import { useState } from 'react';
import { LINKED_FIELDS } from './validators';

// Hook de formularios con validación en tiempo real (equivalente a attachLiveValidation del JS original).
export function useForm(initial, rules) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const check = (name, value, all) => {
    const rule = rules[name];
    return rule ? rule(value, all) : '';
  };

  const setField = (name, value) => {
    const next = { ...values, [name]: value };
    setValues(next);
    if (touched[name] || value !== '') {
      setErrors(e => ({ ...e, [name]: check(name, value, next) }));
    }
    const linked = LINKED_FIELDS[name];
    if (linked && linked in next && next[linked] !== '') {
      setErrors(e => ({ ...e, [linked]: check(linked, next[linked], next) }));
    }
  };

  // Cambia varios campos a la vez (por ejemplo región + comuna) sin pisar valores.
  const setFields = patch => {
    const next = { ...values, ...patch };
    setValues(next);
    setErrors(e => {
      const copy = { ...e };
      Object.keys(patch).forEach(name => {
        copy[name] = patch[name] === '' ? '' : check(name, patch[name], next);
      });
      return copy;
    });
  };

  const handleChange = e => setField(e.target.name, e.target.value);

  const handleBlur = e => {
    const { name, value } = e.target;
    setTouched(t => ({ ...t, [name]: true }));
    setErrors(er => ({ ...er, [name]: check(name, value, values) }));
  };

  // Valida todo; devuelve true si no hay errores.
  const validateAll = () => {
    const nextErrors = {};
    const nextTouched = {};
    Object.keys(rules).forEach(name => {
      nextTouched[name] = true;
      nextErrors[name] = check(name, values[name] ?? '', values);
    });
    setTouched(nextTouched);
    setErrors(nextErrors);
    const firstInvalid = Object.keys(rules).find(name => nextErrors[name]);
    if (firstInvalid) document.getElementById(firstInvalid)?.focus();
    return !firstInvalid;
  };

  // Carga valores existentes (modo edición) limpiando errores.
  const load = vals => {
    setValues(vals);
    setErrors({});
    setTouched({});
  };

  const setFieldError = (name, message) => setErrors(e => ({ ...e, [name]: message }));

  const reset = () => {
    setValues(initial);
    setErrors({});
    setTouched({});
  };

  // Clase CSS según el estado del campo.
  const stateClass = name => (errors[name] ? 'invalid' : touched[name] && values[name] ? 'valid' : '');

  return { values, errors, setField, setFields, handleChange, handleBlur, validateAll, setFieldError, reset, load, stateClass };
}
