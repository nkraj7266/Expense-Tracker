import RestaurantOutlinedIcon from '@mui/icons-material/RestaurantOutlined'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import LocalMoviesOutlinedIcon from '@mui/icons-material/LocalMoviesOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import FavoriteIcon from '@mui/icons-material/Favorite'
import FlightOutlinedIcon from '@mui/icons-material/FlightOutlined'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import './CategoryIcon.css'

const ICONS = {
  utensils: RestaurantOutlinedIcon,
  'shopping-cart': ShoppingCartOutlinedIcon,
  car: DirectionsCarOutlinedIcon,
  bag: ShoppingBagOutlinedIcon,
  film: LocalMoviesOutlinedIcon,
  receipt: ReceiptLongOutlinedIcon,
  heart: FavoriteIcon,
  plane: FlightOutlinedIcon,
  book: MenuBookOutlinedIcon,
  home: HomeOutlinedIcon,
  sparkles: AutoAwesomeIcon,
  'dots-horizontal': MoreHorizIcon,
}

export default function CategoryIcon({ icon, color = '#6B7280', size = 20, className = '' }) {
  const IconComponent = ICONS[icon] || ICONS['dots-horizontal']

  return (
    <span className={`category-icon ${className}`.trim()} style={{ '--category-icon-color': color }}>
      <IconComponent style={{ fontSize: size }} aria-hidden="true" />
    </span>
  )
}
