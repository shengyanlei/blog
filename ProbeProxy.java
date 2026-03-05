import java.net.*;
public class ProbeProxy {
  public static void main(String[] args) throws Exception {
    ProxySelector selector = ProxySelector.getDefault();
    System.out.println("selector=" + selector);
    for (Proxy p : selector.select(URI.create("https://api.notion.com"))) {
      System.out.println("proxy=" + p);
    }
  }
}
