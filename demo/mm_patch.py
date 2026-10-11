# --- test-only: teach mongomock $convert(to double) and $type, which real MongoDB has ---
import mongomock.aggregate as ag
_conv=ag._Parser._handle_type_convertion_operator
def conv(self,op,v):
  if op!='$convert': return _conv(self,op,v)
  try: x=self.parse(v['input'])
  except KeyError: x=None
  if x is None: return v.get('onNull')
  try: return float(x)
  except (TypeError,ValueError): return v.get('onError')
ag._Parser._handle_type_convertion_operator=conv
ag.type_operators.append('$type')
_typ=ag._Parser._handle_type_operator
def typ(self,op,v):
  if op!='$type': return _typ(self,op,v)
  try: x=self.parse(v)
  except KeyError: return 'missing'
  return 'double' if isinstance(x,float) else 'null' if x is None else type(x).__name__
ag._Parser._handle_type_operator=typ
